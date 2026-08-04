import { NextResponse } from "next/server";
import { db } from "@/db";
import { facilities } from "@/db/schema";
import { eq, and, ilike } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const companyIdParam = searchParams.get("companyId");

    const conditions = [];

    if (q) {
      conditions.push(ilike(facilities.name, `%${q}%`));
    }

    // Filter by selected company ID (coerced to number/string matching your schema type)
    if (companyIdParam) {
      const parsedCompanyId = Number(companyIdParam);
      if (!isNaN(parsedCompanyId)) {
        conditions.push(eq(facilities.companyId, parsedCompanyId));
      }
    }

    const results = await db
      .select({
        id: facilities.id,
        name: facilities.name,
        address: facilities.address,
        companyId: facilities.companyId,
        latitude: facilities.latitude,
        longitude: facilities.longitude,
      })
      .from(facilities)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(20);

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error("Failed to fetch combo facilities:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}