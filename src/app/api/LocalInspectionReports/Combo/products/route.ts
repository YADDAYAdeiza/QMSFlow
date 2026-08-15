import { NextResponse } from "next/server";
import { db } from "@/db";
import { productsLocal, productLinesLocal, facilities } from "@/db/schema";
import { eq, and, ilike, SQL } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() || searchParams.get("q")?.trim() || "";
    const lineType = searchParams.get("lineType")?.trim();
    const facilityId = searchParams.get("facilityId")?.trim();
    const companyId = searchParams.get("companyId")?.trim();

    console.log("--> GET /api/products params:", { query, lineType, facilityId, companyId });

    const conditions: SQL[] = [];

    // Search query filter
    if (query) {
      conditions.push(ilike(productsLocal.name, `%${query}%`));
    }

    // Filter by Facility ID if passed and valid
    if (facilityId) {
      const parsedFacilityId = !isNaN(Number(facilityId)) ? Number(facilityId) : facilityId;
      conditions.push(eq(productLinesLocal.facilityId, parsedFacilityId as any));
    } 
    // Fall back to filtering by Company ID if facilityId is not provided
    else if (companyId) {
      const parsedCompanyId = !isNaN(Number(companyId)) ? Number(companyId) : companyId;
      conditions.push(eq(facilities.companyId, parsedCompanyId as any));
    }

    // Line type filter
    if (lineType) {
      conditions.push(ilike(productLinesLocal.name, `%${lineType}%`));
    }

    // Return empty set if no conditions provided to avoid dropping full table content
    if (conditions.length === 0) {
      console.warn("--> No search filters provided to /api/products. Returning empty set.");
      return NextResponse.json([]);
    }

    // Query joined tables
    const results = await db
      .select({
        id: productsLocal.id,
        name: productsLocal.name,
        classification: productsLocal.classification,
        targetSpecies: productsLocal.targetSpecies,
        lineName: productLinesLocal.name,
      })
      .from(productsLocal)
      .innerJoin(productLinesLocal, eq(productsLocal.lineId, productLinesLocal.id))
      .innerJoin(facilities, eq(productLinesLocal.facilityId, facilities.id))
      .where(and(...conditions))
      .limit(30);

    console.log(`--> /api/products returned ${results.length} records.`);

    // Map payload for Combobox consumption including metadata options
    return NextResponse.json(
      results.map((p) => ({
        id: p.id,
        value: p.name,
        label: p.lineName ? `${p.name} (${p.lineName})` : p.name,
        classification: p.classification,
        targetSpecies: p.targetSpecies,
      }))
    );
  } catch (error: any) {
    console.error("Product combo fetch error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch products" }, { status: 500 });
  }
}