import { NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  companies, 
  facilities, 
  productLinesLocal, 
  productsLocal, 
  applications, 
  qmsTimelines 
} from '@/db/schema';
import { eq, and, ilike } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const companyIdInput = body.companyId;
    const facilityIdInput = body.facilityId;
    const companyName = body.companyName?.trim();
    const address = (body.address || body.facilityAddress)?.trim();
    const facilityName = body.facilityName?.trim() || `${companyName} Facility`;
    const latitude = body.latitude;
    const longitude = body.longitude;
    const applicationNumber = body.applicationNumber || `APP-${Date.now()}`;
    const type = body.type || body.inspectionType || 'Pre-Registration';
    
    // Standardized directorate default: VMD
    const targetDirectorate = body.targetDirectorate || 'VMD';
    const estimatedInspectionDays = body.estimatedInspectionDays ?? 3;
    const notificationEmail = body.notificationEmail;
    
    // Standardized division array replacement: ["VMD", "PAD", "AFPD", "IRSD"]
    const assignedDivisions = body.assignedDivisions || ["VMD", "PAD", "AFPD", "IRSD"];
    const productLines = body.productLines || [];

    if (!companyName || !address) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: companyName and address are mandatory.' },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      // 1. Resolve Company
      let company;
      if (companyIdInput) {
        [company] = await tx
          .select()
          .from(companies)
          .where(eq(companies.id, companyIdInput));
      }

      if (!company) {
        [company] = await tx
          .select()
          .from(companies)
          .where(ilike(companies.name, companyName));
      }

      if (!company) {
        [company] = await tx
          .insert(companies)
          .values({
            name: companyName,
            address: address,
            category: 'LOCAL',
          })
          .returning();
      }

      if (!company?.id) {
        throw new Error('Failed to resolve valid Company ID.');
      }

      // 2. Resolve Facility
      let facility;
      if (facilityIdInput) {
        [facility] = await tx
          .select()
          .from(facilities)
          .where(eq(facilities.id, facilityIdInput));
      }

      if (!facility) {
        [facility] = await tx
          .select()
          .from(facilities)
          .where(
            and(
              eq(facilities.companyId, company.id),
              ilike(facilities.address, address)
            )
          );
      }

      if (!facility) {
        [facility] = await tx
          .insert(facilities)
          .values({
            companyId: company.id,
            name: facilityName,
            address: address,
            latitude: latitude != null && latitude !== '' ? parseFloat(latitude) : null,
            longitude: longitude != null && longitude !== '' ? parseFloat(longitude) : null,
          })
          .returning();
      } else if (latitude != null && longitude != null && latitude !== '' && longitude !== '') {
        [facility] = await tx
          .update(facilities)
          .set({ 
            latitude: parseFloat(latitude), 
            longitude: parseFloat(longitude) 
          })
          .where(eq(facilities.id, facility.id))
          .returning();
      }

      if (!facility?.id) {
        throw new Error('Failed to resolve valid Facility ID.');
      }

      // 3. Resolve Product Lines & Products
      if (Array.isArray(productLines)) {
        for (const lineData of productLines) {
          const lineName = lineData.lineName || lineData.name;
          if (!lineName) continue;

          let [line] = await tx
            .select()
            .from(productLinesLocal)
            .where(
              and(
                eq(productLinesLocal.facilityId, facility.id),
                ilike(productLinesLocal.name, lineName)
              )
            );

          if (!line) {
            [line] = await tx
              .insert(productLinesLocal)
              .values({
                facilityId: facility.id,
                name: lineName,
              })
              .returning();
          }

          if (lineData.products && Array.isArray(lineData.products) && lineData.products.length > 0) {
            for (const p of lineData.products) {
              const prodName = (typeof p === 'string' ? p : p.name)?.trim();
              if (!prodName) continue;

              const classification = typeof p === 'string' ? lineData.classification : (p.classification || lineData.classification);
              const targetSpecies = typeof p === 'string' ? lineData.targetSpecies : (p.targetSpecies || lineData.targetSpecies);

              let [existingProd] = await tx
                .select()
                .from(productsLocal)
                .where(
                  and(
                    eq(productsLocal.lineId, line.id),
                    ilike(productsLocal.name, prodName)
                  )
                );

              if (!existingProd) {
                await tx.insert(productsLocal).values({
                  lineId: line.id,
                  name: prodName,
                  classification: classification ?? null,
                  targetSpecies: targetSpecies ?? null,
                });
              } else {
                await tx
                  .update(productsLocal)
                  .set({
                    classification: classification ?? existingProd.classification,
                    targetSpecies: targetSpecies ?? existingProd.targetSpecies,
                    updatedAt: new Date(),
                  })
                  .where(eq(productsLocal.id, existingProd.id));
              }
            }
          }
        }
      }

      // Standardized role title for initial schedule routing
const initialPoint = 'Divisional Deputy Director Technical Assignment';
      // 4. Create Application Tracking Record
      const [application] = await tx
        .insert(applications)
        .values({
          applicationNumber,
          type,
          companyId: company.id,
          facilityId: facility.id,
          currentPoint: initialPoint,
          status: 'INSPECTION_PENDING',
          details: {
            targetDirectorate,
            estimatedInspectionDays,
            notificationEmail,
            assignedDivisions,
            productLines,
          },
        })
        .returning();

      // 5. QMS Timing Enforcement: Record start time for SLA tracking
      await tx.insert(qmsTimelines).values({
        applicationId: application.id,
        point: initialPoint,
        startTime: new Date(),
      });

      return application;
    });

    return NextResponse.json({ 
      success: true, 
      applicationNumber: result.applicationNumber, 
      data: result 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to submit local application:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}