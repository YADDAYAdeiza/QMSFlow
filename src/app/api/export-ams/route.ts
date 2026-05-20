import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  // 1. Reconcile fallback parameters
  const rawStart = searchParams.get('start');
  const rawEnd = searchParams.get('end');
  const rawSpecies = searchParams.get('species');
  const rawRisk = searchParams.get('risk');

  const start = (rawStart && rawStart !== 'undefined') ? rawStart : '2026-01-01';
  const end = (rawEnd && rawEnd !== 'undefined') ? rawEnd : new Date().toISOString();
  const species = (rawSpecies && rawSpecies !== 'undefined') ? rawSpecies : 'All';
  const risk = (rawRisk && rawRisk !== 'undefined') ? rawRisk : 'All';

  console.log("--- VMD PARTIAL-MATCH HOLISTIC EXPORT ---");
  console.log("Executing filters:", { start, end, species, risk });

  // 2. Query broad consumption entries (Delegating complex filtering safely to the runtime)
  const { data: entries, error: entriesError } = await supabase
    .from('ledger_entries')
    .select(`
      created_at,
      entry_type,
      geopolitical_zone,
      destination_state,
      target_species,
      ddd_consumed,
      api_mass_mg,
      pack_quantity,
      metadata,
      atc_id
    `)
    .eq('entry_type', 'CONSUMPTION')
    .gte('created_at', start)
    .lte('created_at', end);

  if (entriesError) {
    console.error("Database Query Error:", entriesError);
    return NextResponse.json({ error: entriesError.message }, { status: 500 });
  }

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: "No raw consumption data found within this timeframe" }, { status: 404 });
  }

  // 3. Pull master ATC definitions to map classifications
  const { data: atcList, error: atcError } = await supabase
    .from('atc_codes')
    .select('id, human_atc, vet_atc, class, substance, risk_priority');

  if (atcError) {
    console.error("Failed to map ATC master catalog relations:", atcError);
    return NextResponse.json({ error: atcError.message }, { status: 500 });
  }

  const atcMap = new Map<string, any>();
  atcList?.forEach(item => atcMap.set(item.id, item));

  // 4. Transform and dynamically map rows
  let rows = entries.map((entry: any) => {
    const meta = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};
    const linkedAtc = entry.atc_id ? atcMap.get(entry.atc_id) : null;

    const atcCode = linkedAtc?.vet_atc || linkedAtc?.human_atc || 'N/A';
    const substance = linkedAtc?.substance || 'N/A';
    const drugClass = linkedAtc?.class || 'N/A';
    
    const directRisk = linkedAtc?.risk_priority || 'N/A';
    const metadataRisk = meta.risk_priority || 'N/A';
    const recordSpecies = entry.target_species || 'N/A';

    return {
      "DATE": new Date(entry.created_at).toLocaleDateString(),
      "ZONE": entry.geopolitical_zone || 'N/A',
      "STATE": entry.destination_state || 'N/A',
      "SUBSTANCE": substance,
      "ATC_CODE": atcCode,
      "CLASS": drugClass,
      "RISK_MASTER": directRisk,
      "RISK_LOGGED": metadataRisk,
      "SPECIES": recordSpecies,
      "QUANTITY": entry.pack_quantity || 0,
      "STRENGTH": meta.strength_at_log || 'N/A',
      "PACK_SIZE": meta.verified_pack_size || 'N/A',
      "TOTAL API CONTENT (mg)": entry.api_mass_mg ? parseFloat(entry.api_mass_mg).toFixed(2) : '0.00',
      "DDD": entry.ddd_consumed ? parseFloat(entry.ddd_consumed).toFixed(4) : '0.0000'
    };
  });

  // 5. Apply Smart Partial Matching Filters

  // A. Case-Insensitive Species Partial Filtering
  if (species !== 'All') {
    const targetSpeciesLower = species.trim().toLowerCase(); // e.g., 'livestock' or 'poultry'
    
    rows = rows.filter((row: any) => {
      const currentSpeciesLower = row.SPECIES.toLowerCase();
      return currentSpeciesLower.includes(targetSpeciesLower);
    });
  }

  // B. Case-Insensitive Risk Partial Filtering
  if (risk !== 'All') {
    const searchRiskLower = risk.trim().toLowerCase();

    rows = rows.filter((row: any) => {
      const masterRisk = row.RISK_MASTER.toLowerCase();
      const loggedRisk = row.RISK_LOGGED.toLowerCase();

      if (searchRiskLower === 'hpcia') {
        return masterRisk.includes('hpcia') || loggedRisk.includes('hpcia') || masterRisk === 'critical';
      }

      return masterRisk === searchRiskLower || loggedRisk.includes(searchRiskLower);
    });
  }

  // 6. Check if anything survived our filtering steps
  if (rows.length === 0) {
    return NextResponse.json({ 
      error: `Filtered records yielded zero matches for species: "${species}" and risk profile: "${risk}"` 
    }, { status: 404 });
  }

  // 7. Generate Excel File Output Buffer
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "VMD Consumption Audit Log");

  // Autofit column space widths
  const maxWds = rows.reduce((acc: any, row: any) => {
    Object.keys(row).forEach((key, idx) => {
      const valLen = row[key] ? row[key].toString().length : 10;
      const keyLen = key.length;
      acc[idx] = Math.max(acc[idx] || 0, valLen, keyLen);
    });
    return acc;
  }, []);
  worksheet['!cols'] = maxWds.map((w: number) => ({ wch: w + 3 }));

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="VMD_Consumption_Audit_Log.xlsx"`
    },
  });
}