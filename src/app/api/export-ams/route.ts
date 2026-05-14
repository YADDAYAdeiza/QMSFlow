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

  // Use a standard join instead of !inner to be less restrictive while debugging
  let query = supabase
    .from('ledger_entries')
    .select(`
      created_at,
      geopolitical_zone,
      destination_state,
      target_species,
      ddd_consumed,
      api_mass_mg,
      atc_codes (
        substance,
        class,
        risk_priority
      ),
      permits (
        permit_number,
        company_name,
        product_name
      )
    `);

  // Only apply filters if they actually exist in the URL
  if (start && start !== 'undefined') query = query.gte('created_at', start);
  if (end && end !== 'undefined') query = query.lte('created_at', end);
  if (species && species !== 'All') query = query.eq('target_species', species);
  
  // Risk filter needs to handle the nested join correctly
  if (risk && risk !== 'All') {
    query = query.eq('atc_codes.risk_priority', risk);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Debugging: If no data, let's see what the query actually found
  if (!data || data.length === 0) {
    console.log("No data returned from Supabase for these filters.");
    return NextResponse.json({ error: "No data found" }, { status: 404 });
  }

  const rows = data.map((entry: any) => ({
    "DATE": entry.created_at ? new Date(entry.created_at).toLocaleDateString() : 'N/A',
    "ZONE": entry.geopolitical_zone || 'N/A',
    "STATE": entry.destination_state || 'N/A',
    "COMPANY": entry.permits?.company_name || 'N/A',
    "PERMIT": entry.permits?.permit_number || 'N/A',
    "SUBSTANCE": entry.atc_codes?.substance || 'N/A',
    "CLASS": entry.atc_codes?.class || 'N/A',
    "RISK": entry.atc_codes?.risk_priority || 'N/A',
    "SPECIES": entry.target_species || 'N/A',
    "DDD": entry.ddd_consumed || 0
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "VMD Export");

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="VMD_Audit_Log.xlsx"`
    },
  });
}