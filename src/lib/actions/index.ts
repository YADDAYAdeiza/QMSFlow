"use server";

import { db } from "@/db";
import { 
  companies, facilities, companyAffiliations, productLinesLocal, 
  productsLocal, applications, qmsTimelines, riskAssessments, users, productLineRisks 
} from "@/db/schema";
import { and, eq, isNull, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { lodFormSchema } from "@/lib/validations";
import { getWorkflowByDirectorate } from "@/config/workflows/facilityVerificationWorkflow";
import nodemailer from "nodemailer";

const normalize = (str: string) => str?.trim().toUpperCase() || "";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS, 
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false
  }
});

export async function sendDirectorOversightEmail(appDetails: {
  appNumber: string;
  type: string;
  companyName: string;
  facilityName: string;
  directorate: string;
  lodRemarks?: string;
  customRecipient?: string;
}) {
  try {
    const senderEmail = process.env.SMTP_USER;
    const directorEmail = appDetails.customRecipient || process.env.DIRECTOR_EMAIL || "director@nafdac.gov.ng";

    if (!senderEmail || !process.env.SMTP_PASS) {
      return { success: false, error: "SMTP credentials are misconfigured." };
    }

    const mailOptions = {
      from: `"${appDetails.directorate} Portal" <${senderEmail}>`,
      to: directorEmail,
      subject: `🚨 LIVE PROCESSING ALERT [${appDetails.directorate}]: Application #${appDetails.appNumber}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #0f172a; text-transform: uppercase; font-size: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            Director Oversight Notification (${appDetails.directorate})
          </h2>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #64748b; width: 140px;">Directorate:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #0284c7;">${appDetails.directorate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #64748b;">App Number:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #1e3a8a;">${appDetails.appNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Review Type:</td>
              <td style="padding: 8px 0; color: #334155;">${appDetails.type}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Local Applicant:</td>
              <td style="padding: 8px 0; color: #334155; text-transform: uppercase;">${appDetails.companyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Manufacturing Site:</td>
              <td style="padding: 8px 0; color: #334155; text-transform: uppercase;">${appDetails.facilityName}</td>
            </tr>
          </table>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Error dispatching email:", error);
    return { success: false, error: error.message || "Failed to dispatch email." };
  }
}

export async function submitLODApplication(
  rawData: any,
  userId: string, 
  userName: string, 
  userRole: string
) {
  const validated = lodFormSchema.safeParse(rawData);
  if (!validated.success) return { success: false, error: "Validation Failed" };

  const data = validated.data;
  const normalizedAppNumber = normalize(data.appNumber);
  const shouldNotifyDirector = !!data.sendEmailNotification; 

  try {
    const result = await db.transaction(async (tx) => {
      const existingApp = await tx.query.applications.findFirst({
        where: eq(applications.applicationNumber, normalizedAppNumber)
      });
      
      const submittingUser = await tx.query.users.findFirst({
        where: eq(users.id, userId)
      });

      console.log('This is the submitting user', submittingUser);

      const isUpdate = !!existingApp;
      const userDivision = submittingUser?.division || "REGISTRATION";
      const appDirectorate = (data as any).directorate || submittingUser?.directorate || existingApp?.directorate || "VMAP";
      
      // Resolve workflow state configuration based on directorate
      const workflowConfig = getWorkflowByDirectorate(appDirectorate);
      const initialStep = workflowConfig.steps["DIRECTOR_INTAKE"] || workflowConfig.steps["LOD"];
      
      const targetPoint = initialStep?.title || "Director Initial Allocation";
      const nextStatus = initialStep?.statusLabel || "PENDING_DIRECTOR_ALLOCATION";

      const isActuallyRound2 = isUpdate && (existingApp.status === 'TECHNICAL_PASSED' || (existingApp.details as any)?.isComplianceReview === true);

      // 1. Upsert Local Company (Applicant)
      const localCompName = normalize(data.companyName || (data as any).localCompanyName);
      const localCompAddress = (data.companyAddress || (data as any).localCompanyAddress)?.trim() || "";
      
      let localComp = await tx.query.companies.findFirst({
        where: and(eq(companies.name, localCompName), eq(companies.category, 'LOCAL'), eq(companies.address, localCompAddress))
      });

      if (!localComp) {
        await tx.insert(companies).values({ 
          name: localCompName, 
          address: localCompAddress, 
          category: 'LOCAL' 
        })
        .onConflictDoNothing();
        
        localComp = await tx.query.companies.findFirst({
          where: and(eq(companies.name, localCompName), eq(companies.category, 'LOCAL'), eq(companies.address, localCompAddress))
        });
      }

      // 2. Upsert Foreign Company (Manufacturer Entity)
      const foreignCompName = normalize(data.facilityName || (data as any).foreignFactoryName);
      const foreignCompAddress = (data.facilityAddress || (data as any).foreignFactoryAddress)?.trim() || "";

      let foreignCompany = await tx.query.companies.findFirst({
        where: and(eq(companies.name, foreignCompName), eq(companies.category, 'FOREIGN'), eq(companies.address, foreignCompAddress))
      });

      if (!foreignCompany) {
        await tx.insert(companies).values({ 
          name: foreignCompName, 
          address: foreignCompAddress, 
          category: 'FOREIGN' 
        })
        .onConflictDoNothing();

        foreignCompany = await tx.query.companies.findFirst({
          where: and(eq(companies.name, foreignCompName), eq(companies.category, 'FOREIGN'), eq(companies.address, foreignCompAddress))
        });
      }

      await tx.insert(companyAffiliations).values({ 
        localCompanyId: localComp!.id, 
        foreignFactoryId: foreignCompany!.id 
      }).onConflictDoNothing();

      // 3. Upsert Physical Facility under Foreign Company
      let facility = await tx.query.facilities.findFirst({
        where: and(
          eq(facilities.companyId, foreignCompany!.id),
          eq(facilities.name, foreignCompName)
        ),
      });

      if (!facility) {
        const [insertedFacility] = await tx
          .insert(facilities)
          .values({
            name: foreignCompName,
            address: foreignCompAddress,
            companyId: foreignCompany!.id,
            latitude: (data as any).latitude ? parseFloat(String((data as any).latitude)) : null,
            longitude: (data as any).longitude ? parseFloat(String((data as any).longitude)) : null,
          })
          .returning();
        facility = insertedFacility;
      } else {
        // Update coordinates or details if provided fresh
        await tx
          .update(facilities)
          .set({
            latitude: Number.isNaN(latVal) ? facility.latitude : (latVal ?? facility.latitude),
            longitude: Number.isNaN(lngVal) ? facility.longitude : (lngVal ?? facility.longitude),
          })
          .where(eq(facilities.id, facility.id));
      }

      // 4. Products & Intrinsic Risk Calculation using local schema tables
      let maxComp = 1;
      let maxCrit = 1;

      for (const lineEntry of data.productLines) {
        const trimmedLineName = (lineEntry.lineName || "").trim();
        if (!trimmedLineName) continue;

        const riskMaster = await tx.query.productLineRisks.findFirst({
          where: eq(productLineRisks.lineName, trimmedLineName),
        });

        if (riskMaster) {
          maxComp = Math.max(maxComp, riskMaster.complexityScore);
          maxCrit = Math.max(maxCrit, riskMaster.criticalityScore);
        } else if (lineEntry.riskCategory) {
          const categoryKey = normalize(lineEntry.riskCategory);
          const fallbackMap: Record<string, { comp: number; crit: number }> = {
            "VACCINES / BIOLOGICALS": { comp: 3, crit: 3 },
            "STERILE INJECTABLES": { comp: 3, crit: 2 },
            "POWDER BETA-LACTAMS": { comp: 2, crit: 3 },
            "TABLETS (GENERAL)": { comp: 1, crit: 2 },
            "MULTIVITAMINS": { comp: 1, crit: 1 },
          };
          const mapped = fallbackMap[categoryKey];
          if (mapped) {
            maxComp = Math.max(maxComp, mapped.comp);
            maxCrit = Math.max(maxCrit, mapped.crit);
          }
        }

        let productLine = await tx.query.productLinesLocal.findFirst({
          where: and(
            eq(productLinesLocal.facilityId, facility.id),
            eq(productLinesLocal.name, trimmedLineName)
          ),
        });

        if (!productLine) {
          const [insertedLine] = await tx
            .insert(productLinesLocal)
            .values({
              facilityId: facility.id,
              name: trimmedLineName,
            })
            .returning();
          productLine = insertedLine;
        }

        if (lineEntry.products) {
          for (const prod of lineEntry.products) {
            const trimmedProdName = (prod.name || "").trim();
            if (!trimmedProdName) continue;

            const existingProduct = await tx.query.productsLocal.findFirst({
              where: and(
                eq(productsLocal.lineId, productLine.id),
                eq(productsLocal.name, trimmedProdName)
              ),
            });

            if (!existingProduct) {
              await tx.insert(productsLocal).values({
                lineId: productLine.id,
                name: trimmedProdName,
                classification: prod.classification ?? null,
                targetSpecies: prod.targetSpecies ?? null,
              });
            }
          }
        }
      }

      // 5. Comment & Detail Threading
      const existingDetails = (existingApp?.details as any) || {};
      const newComment = {
        from: userName,
        role: userRole,
        text: data.lodRemarks || (isUpdate ? "Technical details updated." : "Application initiated."),
        round: isActuallyRound2 ? 2 : 1,
        action: isActuallyRound2 ? "COMPLIANCE_DATA_UPDATE" : "INTAKE_DIRECTIVE",
        timestamp: new Date().toISOString()
      };

      const enhancedDetails = {
        ...data,
        directorate: appDirectorate,
        comments: [...(existingDetails.comments || []), newComment],
        isComplianceReview: isActuallyRound2 
      };

      let appId: number;

      if (isUpdate && existingApp) {
        appId = existingApp.id;
        
        await tx.update(applications)
          .set({
            status: nextStatus,
            currentPoint: targetPoint,
            directorate: appDirectorate,
            details: enhancedDetails,
            type: data.type,
            updatedAt: sql`now()`
          })
          .where(eq(applications.id, appId));

        await tx.update(qmsTimelines)
          .set({ endTime: sql`now()` })
          .where(and(eq(qmsTimelines.applicationId, appId), isNull(qmsTimelines.endTime)));

      } else {
        const [newApp] = await tx.insert(applications).values({
          applicationNumber: normalizedAppNumber,
          type: data.type,
          directorate: appDirectorate,
          companyId: localComp!.id,
          foreignFactoryId: foreignCompany!.id,
          facilityId: facility.id,
          status: nextStatus,
          currentPoint: targetPoint,
          details: enhancedDetails
        }).returning();
        appId = newApp.id;
      }

      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        staffId: userId,
        division: userDivision as any, 
        point: targetPoint,
        startTime: sql`now()`
      });

      // 6. Risk Assessment Logic
      const score = maxComp * maxCrit;
      let intrinsicLevel = "LOW";
      if (score >= 12) intrinsicLevel = "HIGH";
      else if (score >= 6) intrinsicLevel = "MEDIUM";

      await tx.insert(riskAssessments)
        .values({
          facilityId: facility.id,
          applicationId: appId,
          complexityScore: maxComp,
          criticalityScore: maxCrit,
          intrinsicLevel,
          status: isActuallyRound2 ? 'DRAFT' : 'PARTIAL'
        })
        .onConflictDoUpdate({
          target: [riskAssessments.applicationId],
          set: {
            facilityId: facility.id,
            complexityScore: maxComp,
            criticalityScore: maxCrit,
            intrinsicLevel,
            updatedAt: sql`now()`
          }
        });

      revalidatePath("/dashboard/director");
      revalidatePath("/dashboard/lod");
      
      return { 
        success: true, 
        id: appId, 
        appNumber: normalizedAppNumber, 
        type: data.type, 
        directorate: appDirectorate,
        lodRemarks: data.lodRemarks, 
        companyName: data.companyName, 
        facilityName: data.facilityName 
      };
    });

    if (result.success && shouldNotifyDirector) {
      const directorUser = await db.query.users.findFirst({
        where: and(eq(users.role, "Director"), eq(users.directorate, result.directorate))
      });

      try {
        await sendDirectorOversightEmail({
          appNumber: result.appNumber,
          type: result.type,
          directorate: result.directorate,
          companyName: result.companyName,
          facilityName: result.facilityName,
          lodRemarks: result.lodRemarks,
          customRecipient: directorUser?.email 
        });
      } catch (err) {
        console.error("Non-blocking notification system error captured:", err);
      }
    }

    return { success: true, id: result.id };
  } catch (e: any) {
    console.error("LOD Submission Error:", e);
    return { success: false, error: e.message };
  }
}

export async function getApplications() {
  try {
    const data = await db.query.applications.findMany({
      columns: {
        id: true,
        applicationNumber: true,
        directorate: true,
      },
      orderBy: [desc(applications.id)],
      limit: 50,
    });
    
    return data;
  } catch (error) {
    console.error("Failed to fetch applications:", error);
    return [];
  }
}