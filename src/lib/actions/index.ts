"use server";

import { db } from "@/db"; 
import {
  companies,
  facilities,
  companyAffiliations,
  productLinesLocal,
  productsLocal,
  productLineRisks,
  applications,
  riskAssessments,
  qmsTimelines,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import nodemailer from "nodemailer";
import { sendOversightEmail } from "@/lib/utils/mail";

export interface ProductInput {
  name: string;
  classification?: string;
  targetSpecies?: string;
}

export interface ProductLineInput {
  lineName: string;
  riskCategory?: string;
  products: ProductInput[];
}

export interface SubmitLODPayload {
  companyName?: string;
  localCompanyName?: string;
  companyAddress?: string;
  localCompanyAddress?: string;
  
  facilityName?: string;
  foreignFactoryName?: string;
  facilityAddress?: string;
  foreignFactoryAddress?: string;
  
  latitude?: string | number;
  longitude?: string | number;
  facilityLatitude?: number;
  facilityLongitude?: number;
  
  facilityType?: string;
  siteScope?: string;
  
  productLines: ProductLineInput[];
  divisions?: string[];
  
  type?: string;
  applicationType?: string;
  
  notificationEmail?: string;
  poaUrl?: string;
  inspectionReportUrl?: string;
  archivedPath?: string;
  
  lodRemarks?: string;
  userComment?: string;
  
  submittedByStaffId?: string;
  sendEmailNotification?: boolean;
}

export async function submitLODApplication(
  payload: SubmitLODPayload,
  userId?: string,
  userName?: string,
  userRole?: string
) {
  try {
    // 💡 Normalize field names seamlessly between client and backend conventions
    const localName = (payload.localCompanyName || payload.companyName || "").trim();
    const localAddr = (payload.localCompanyAddress || payload.companyAddress || "").trim();
    const foreignName = (payload.foreignFactoryName || payload.facilityName || "").trim();
    const foreignAddr = (payload.foreignFactoryAddress || payload.facilityAddress || "").trim();
    const appType = payload.applicationType || payload.type || "Facility Verification";
    const userRemarks = payload.userComment || payload.lodRemarks || "";
    const staffId = userId || payload.submittedByStaffId || null;
    const assignedDivs = payload.divisions && payload.divisions.length > 0 ? payload.divisions : ["VMD"];

    const latVal = payload.facilityLatitude ?? (payload.latitude ? parseFloat(String(payload.latitude)) : null);
    const lngVal = payload.facilityLongitude ?? (payload.longitude ? parseFloat(String(payload.longitude)) : null);

    if (!localName) {
      throw new Error("Local Applicant Company Name is required.");
    }
    if (!foreignName) {
      throw new Error("Foreign Manufacturing Site Name is required.");
    }

    const result = await db.transaction(async (tx) => {
      // 1. Upsert Local Company (Applicant)
      let localCompany = await tx.query.companies.findFirst({
        where: and(
          eq(companies.name, localName),
          eq(companies.address, localAddr)
        ),
      });

      if (!localCompany) {
        const [inserted] = await tx
          .insert(companies)
          .values({
            name: localName,
            address: localAddr,
            category: "LOCAL",
          })
          .returning();
        localCompany = inserted;
      }

      // 2. Upsert Foreign Company (Manufacturer Entity)
      let foreignCompany = await tx.query.companies.findFirst({
        where: and(
          eq(companies.name, foreignName),
          eq(companies.address, foreignAddr)
        ),
      });

      if (!foreignCompany) {
        const [inserted] = await tx
          .insert(companies)
          .values({
            name: foreignName,
            address: foreignAddr,
            category: "FOREIGN",
          })
          .returning();
        foreignCompany = inserted;
      }

      // 3. Maintain Many-to-Many Relationship via companyAffiliations
      await tx
        .insert(companyAffiliations)
        .values({
          localCompanyId: localCompany.id,
          foreignFactoryId: foreignCompany.id,
        })
        .onConflictDoNothing();

      // 4. Upsert Physical Facility under Foreign Company
      let facility = await tx.query.facilities.findFirst({
        where: and(
          eq(facilities.companyId, foreignCompany.id),
          eq(facilities.name, foreignName)
        ),
      });

      if (!facility) {
        const [insertedFacility] = await tx
          .insert(facilities)
          .values({
            name: foreignName,
            address: foreignAddr,
            companyId: foreignCompany.id,
            latitude: Number.isNaN(latVal) ? null : latVal,
            longitude: Number.isNaN(lngVal) ? null : lngVal,
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

      // 5. Process Product Lines & Products (Facility-Anchored)
      let maxComplexity = 1;
      let maxCriticality = 1;

      for (const line of payload.productLines || []) {
        const trimmedLineName = (line.lineName || "").trim();
        if (!trimmedLineName) continue;

        const riskMaster = await tx.query.productLineRisks.findFirst({
          where: eq(productLineRisks.lineName, trimmedLineName),
        });

        if (riskMaster) {
          if (riskMaster.complexityScore > maxComplexity) maxComplexity = riskMaster.complexityScore;
          if (riskMaster.criticalityScore > maxCriticality) maxCriticality = riskMaster.criticalityScore;
        } else if (line.riskCategory) {
          // Fallback evaluation if explicit category was submitted from form dropdown
          const fallbackMap: Record<string, { comp: number; crit: number }> = {
            "VACCINES / BIOLOGICALS": { comp: 3, crit: 3 },
            "STERILE INJECTABLES": { comp: 3, crit: 2 },
            "POWDER BETA-LACTAMS": { comp: 2, crit: 3 },
            "TABLETS (GENERAL)": { comp: 1, crit: 2 },
            "MULTIVITAMINS": { comp: 1, crit: 1 },
          };
          const mapped = fallbackMap[line.riskCategory];
          if (mapped) {
            if (mapped.comp > maxComplexity) maxComplexity = mapped.comp;
            if (mapped.crit > maxCriticality) maxCriticality = mapped.crit;
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

        for (const prod of line.products || []) {
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

      // 6. Generate Unique Application Number & Save Application
      const year = new Date().getFullYear();
      const randomSequence = Math.floor(100000 + Math.random() * 900000);
      const applicationNumber = `NAFDAC/VMD/LOD/${year}/${randomSequence}`;

      const initialComments = userRemarks
        ? [
            {
              from: userName || localName,
              role: userRole || "Divisional Deputy Director",
              text: userRemarks,
              timestamp: new Date().toISOString(),
            },
          ]
        : [];

      const [newApplication] = await tx
        .insert(applications)
        .values({
          applicationNumber,
          type: appType,
          companyId: localCompany.id,
          foreignFactoryId: foreignCompany.id,
          facilityId: facility.id,
          currentPoint: "Divisional Deputy Director",
          status: "PENDING_DIRECTOR",
          details: {
            assignedDivisions: assignedDivs,
            productLines: payload.productLines,
            facilityType: payload.facilityType || "Pharma",
            siteScope: payload.siteScope || "New Manufacturing Site",
            notificationEmail: payload.notificationEmail,
            poaUrl: payload.poaUrl,
            inspectionReportUrl: payload.inspectionReportUrl,
            archived_path: payload.archivedPath,
            comments: initialComments,
          },
        })
        .returning();

      // 7. Risk Assessment linked directly to physical facility UUID
      const combinedRiskScore = maxComplexity * maxCriticality;
      let intrinsicLevel = "LOW";
      if (combinedRiskScore >= 12) intrinsicLevel = "HIGH";
      else if (combinedRiskScore >= 6) intrinsicLevel = "MEDIUM";

      await tx.insert(riskAssessments).values({
        facilityId: facility.id,
        applicationId: newApplication.id,
        complexityScore: maxComplexity,
        criticalityScore: maxCriticality,
        intrinsicLevel,
        sraStatus: "FALSE",
        majorDeficiencies: 0,
        criticalDeficiencies: 0,
        otherDeficiencies: 0,
        status: "PARTIAL",
      });

      // 8. QMS SLA Timing Initialization
      await tx.insert(qmsTimelines).values({
        applicationId: newApplication.id,
        staffId,
        division: assignedDivs[0] || "VMD",
        point: "Divisional Deputy Director",
        startTime: new Date(),
        details: { action: "APPLICATION_SUBMITTED" },
      });

      return newApplication;
    });

    // 9a. External Email: Applicant Receipt Acknowledgment
    if (payload.notificationEmail) {
      await sendNotificationEmail(
        payload.notificationEmail,
        result.applicationNumber,
        localName
      );
    }

    // 9b. Internal Email: Director Oversight & CC Tracking (Only if enabled or present)
    if (payload.sendEmailNotification ?? true) {
      await sendOversightEmail({
        appNumber: result.applicationNumber,
        type: appType,
        companyName: localName,
        facilityName: foreignName,
        lodRemarks: userRemarks,
      });
    }

    return {
      success: true,
      data: result,
      message: "LOD Application submitted successfully.",
    };
  } catch (error: any) {
    console.error("Error submitting LOD Application:", error);
    return {
      success: false,
      error: error?.message || "Failed to submit LOD Application.",
    };
  }
}

async function sendNotificationEmail(
  toEmail: string,
  appNumber: string,
  companyName: string
) {
  try {
    const senderEmail = process.env.SMTP_USER;

    if (!senderEmail || !process.env.SMTP_PASS) {
      console.error("❌ ERROR: Missing SMTP credentials in environment variables.");
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: {
        user: senderEmail,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false,
      },
    });

    const info = await transporter.sendMail({
      from: `"Veterinary Medicine Division (VMD)" <${senderEmail}>`,
      to: toEmail,
      subject: `Application Receipt Acknowledgment: ${appNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0066cc; margin-top: 0;">Application Submitted Successfully</h2>
          <p>Dear <strong>${companyName}</strong>,</p>
          <p>Your application has been successfully logged into the regulatory workflow system.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; width: 35%;"><strong>Application Number:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${appNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Current Workflow Stage:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">Divisional Deputy Director</td>
            </tr>
          </table>
          <p>You can track the live evaluation timeline through your portal dashboard.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">
            <strong>Veterinary Medicine Division (VMD)</strong><br/>NAFDAC QMS Automated Dispatch
          </p>
        </div>
      `,
    });

    console.log(`✅ Email successfully dispatched to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (emailError) {
    console.error("❌ Failed to send acknowledgment email:", emailError);
  }
}