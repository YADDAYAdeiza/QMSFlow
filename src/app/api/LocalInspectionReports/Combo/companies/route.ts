import { NextResponse } from 'next/server';
import { db } from '@/db';
import { companies } from '@/db/schema';
import { ilike } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    const results = await db
      .select({ id: companies.id, name: companies.name, address: companies.address })
      .from(companies)
      .where(ilike(companies.name, `%${query}%`))
      .limit(10);

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}