import { NextResponse } from "next/server";
import { db } from "@/db";
import { productsLocal, productLinesLocal, facilities } from "@/db/schema";
import { eq, and, ilike } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const lineType = searchParams.get("lineType");
    const facilityId = searchParams.get("facilityId");
    const companyId = searchParams.get("companyId");

    const conditions = [];

    if (query) {
      conditions.push(ilike(productsLocal.name, `%${query}%`));
    }

    // Filter by specific facility if selected
    if (facilityId) {
      conditions.push(eq(productLinesLocal.facilityId, facilityId));
    }

    // Otherwise, filter by company ID across all their facilities
    if (companyId && !facilityId) {
      conditions.push(eq(facilities.companyId, Number(companyId)));
    }

    // Optional: Filter by line category/form if passed
    if (lineType) {
      conditions.push(ilike(productLinesLocal.name, lineType));
    }

    const results = await db
      .select({
        id: productsLocal.id,
        name: productsLocal.name,
        classification: productsLocal.classification,
        targetSpecies: productsLocal.targetSpecies,
      })
      .from(productsLocal)
      .innerJoin(productLinesLocal, eq(productsLocal.lineId, productLinesLocal.id))
      .innerJoin(facilities, eq(productLinesLocal.facilityId, facilities.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(20);

    return NextResponse.json(
      results.map((p) => ({
        id: p.id,
        label: p.name,
        value: p.name,
        classification: p.classification,
        targetSpecies: p.targetSpecies,
      }))
    );
  } catch (error) {
    console.error("Product combo fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}