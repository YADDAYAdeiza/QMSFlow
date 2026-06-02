import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  // 1. Reconcile parameters
  const start = searchParams.get('start') || '2026-01-01';
  const end = searchParams.get('end') || new Date().toISOString();
  const species = searchParams.get('species') || 'All';
  const risk = searchParams.get('risk') || 'All';

  // 2. Fetch data (Lean Select)
  const { data: entries, error: entriesError } = await supabase
    .from('ledger_entries')
    .select(`
      created_at, entry_type, geopolitical_zone, destination_state, 
      target_species, ddd_consumed, api_mass_mg, pack_quantity, 
      metadata, atc_id
    `)
    .eq('entry_type', 'CONSUMPTION')
    .gte('created_at', start)
    .lte('created_at', end);

  if (entriesError || !entries?.length) {
    return NextResponse.json({ error: "No data found or query failed" }, { status: 404 });
  }

  // 3. Map ATC references (Memoization)
  const { data: atcList } = await supabase.from('atc_codes').select('id, human_atc, vet_atc, class, substance, risk_priority');
  const atcMap = new Map(atcList?.map(item => [item.id, item]));

  // 4. Transform rows
  let rows = entries.map((entry: any) => {
    const meta = (entry.metadata || {}) as any;
    const atc = entry.atc_id ? atcMap.get(entry.atc_id) : ({} as any);

    return {
      "DATE": new Date(entry.created_at).toLocaleDateString(),
      "ZONE": entry.geopolitical_zone || 'N/A',
      "STATE": entry.destination_state || 'N/A',
      "SUBSTANCE": atc.substance || 'N/A',
      "ATC": atc.vet_atc || atc.human_atc || 'N/A',
      "CLASS": atc.class || 'N/A',
      "RISK_MASTER": atc.risk_priority || 'N/A',
      "RISK_LOGGED": meta.risk_priority || 'N/A',
      "SPECIES": entry.target_species || 'N/A',
      "QUANTITY": entry.pack_quantity || 0,
      "STRENGTH": meta.strength_at_log || 'N/A',
      "PACK_SIZE": meta.verified_pack_size || 'N/A',
      "TOTAL API (mg)": parseFloat(entry.api_mass_mg || 0).toFixed(2),
      "DDD": parseFloat(entry.ddd_consumed || 0).toFixed(4)
    };
  });

  // 5. Apply your Custom "Smart Partial Matching" logic
  if (species !== 'All') {
    const s = species.toLowerCase();
    rows = rows.filter(r => r.SPECIES.toLowerCase().includes(s));
  }

  if (risk !== 'All') {
    const r = risk.toLowerCase();
    rows = rows.filter(row => {
      const m = row.RISK_MASTER.toLowerCase();
      const l = row.RISK_LOGGED.toLowerCase();
      return r === 'hpcia' 
        ? (m.includes('hpcia') || l.includes('hpcia') || m === 'critical')
        : (m === r || l.includes(r));
    });
  }

  if (rows.length === 0) return NextResponse.json({ error: "No matches" }, { status: 404 });

  // 6. Generate Excel
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "VMD_Audit_Log");
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  // 7. SECURE RETURN
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="VMD_Audit_Log.xlsx"',
      'Cache-Control': 'no-store, no-cache, must-revalidate', // CRITICAL: Security
      'Pragma': 'no-cache'
    },
  });
}