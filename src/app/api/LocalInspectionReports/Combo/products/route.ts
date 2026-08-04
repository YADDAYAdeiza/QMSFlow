import { NextResponse } from "next/server";
import { db } from "@/db";
import { productsLocal, productLinesLocal } from "@/db/schema";
import { eq, and, ilike } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const lineType = searchParams.get("lineType"); // e.g., "Solid" or "Liquid"
    const facilityId = searchParams.get("facilityId"); // e.g., "a9aff14b-4620-418e-8928-0e9da39b1d1f"

    const conditions = [];

    // Filter by product name search query
    if (q) {
      conditions.push(ilike(productsLocal.name, `%${q}%`));
    }

    // Filter by production line name (Solid, Liquid, etc.)
    if (lineType) {
      conditions.push(eq(productLinesLocal.name, lineType));
    }

    // Filter strictly by the current facility ID
    if (facilityId) {
      conditions.push(eq(productLinesLocal.facilityId, facilityId));
    }

    const results = await db
      .select({
        id: productsLocal.id,
        name: productsLocal.name,
        classification: productsLocal.classification,
        targetSpecies: productsLocal.targetSpecies,
        lineId: productsLocal.lineId,
        lineName: productLinesLocal.name,
        facilityId: productLinesLocal.facilityId,
      })
      .from(productsLocal)
      .innerJoin(productLinesLocal, eq(productsLocal.lineId, productLinesLocal.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(20);

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error("Failed to fetch combo products:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}


// import { createClient } from "@supabase/supabase-js";
// import { NextResponse } from "next/server";

// export async function GET(request: Request) {
//   const { searchParams } = new URL(request.url);
//   const q = searchParams.get("q") || "";
//   const lineType = searchParams.get("lineType");

//   let query = supabase
//     .from("products_local")
//     .select("id, name, classification, target_species, product_lines_local!inner(name)");

//   if (q) {
//     query = query.ilike("name", `%${q}%`);
//   }

//   if (lineType) {
//     // Filters products where the parent line's name matches lineType
//     query = query.eq("product_lines_local.name", lineType);
//   }

//   const { data, error } = await query.limit(20);

//   if (error) {
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }

//   return NextResponse.json({ success: true, data });
// }