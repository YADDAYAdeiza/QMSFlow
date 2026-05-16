import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const species = searchParams.get('species');
  const risk = searchParams.get('risk');

  console.log("Exporting with filters:", { start, end, species, risk });

  // FIXED: Removed "!inner" from the core select string to allow a LEFT JOIN behavior.
  // This ensures ledger entries show up even if their ATC mapping is missing.
  let query = supabase
    .from('ledger_entries')
    .select(`
      created_at,
      geopolitical_zone,
      destination_state,
      target_species,
      ddd_consumed,
      api_mass_mg,
      pack_quantity,
      metadata,
      atc_codes (
        human_atc,
        vet_atc,
        substance,
        class,
        risk_priority
      ),
      permits (
        permit_number,
        company_name,
        product_name,
        strength,
        shipping_pack_size,
        route_of_administration
      )
    `);

  // Only apply filters if they actually exist in the URL
  if (start && start !== 'undefined') query = query.gte('created_at', start);
  if (end && end !== 'undefined') query = query.lte('created_at', end);
  if (species && species !== 'All') query = query.eq('target_species', species);

  const { data, error } = await query;

  if (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Debugging block preserved
  if (!data || data.length === 0) {
    console.log("No data returned from Supabase for these filters.");
    return NextResponse.json({ error: "No data found" }, { status: 404 });
  }

  // Map and reconstruct the records cleanly
  let rows = data.map((entry: any) => {
    // Safely extract metadata properties if they exist
    const meta = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};

    // Reconcile ATC code variant fields (prioritizing veterinary system codes)
    const atcCode = entry.atc_codes?.vet_atc || entry.atc_codes?.human_atc || 'N/A';

    return {
      "DATE": new Date(entry.created_at).toLocaleDateString(),
      "ZONE": entry.geopolitical_zone,
      "STATE": entry.destination_state,
      "COMPANY": entry.permits?.company_name || 'N/A',
      "PERMIT": entry.permits?.permit_number || 'N/A',
      "PRODUCT": entry.permits?.product_name || 'N/A',
      "SUBSTANCE": entry.atc_codes?.substance || 'N/A',
      
      // --- RECONCILED FIELDS ---
      "ATC_CODE": atcCode,
      "ROUTE": entry.permits?.route_of_administration || 'N/A',
      
      // Fall back to historical logged metadata if master data row didn't exist yet
      "STRENGTH": entry.permits?.strength || meta.strength_at_log || 'N/A',
      "QUANTITY": entry.pack_quantity || 0,
      "PACK_SIZE": entry.permits?.shipping_pack_size || meta.verified_pack_size || 'N/A',
      
      "CLASS": entry.atc_codes?.class || 'N/A',
      "RISK": entry.atc_codes?.risk_priority || 'N/A',
      "SPECIES": entry.target_species || 'N/A',
      "TOTAL API CONTENT (mg)": entry.api_mass_mg ? parseFloat(entry.api_mass_mg).toFixed(2) : '0.00',
      "DDD": entry.ddd_consumed ? parseFloat(entry.ddd_consumed).toFixed(4) : '0.0000'
    };
  });

  // FIXED: Post-processing filter handles the risk criteria matching flawlessly 
  // on the mapped rows, keeping rows like Mustacyn from dropping out on a LEFT JOIN.
  if (risk && risk !== 'All') {
    rows = rows.filter((row: any) => row.RISK.toLowerCase() === risk.toLowerCase());
  }

  // Handle case where custom filtering clears out your spreadsheet completely
  if (rows.length === 0) {
    return NextResponse.json({ error: "No data found matching criteria" }, { status: 404 });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "VMD Export");

  // Autofit column widths intact so headers aren't cut off in Excel
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
      'Content-Disposition': `attachment; filename="VMD_Audit_Log.xlsx"`
    },
  });
}