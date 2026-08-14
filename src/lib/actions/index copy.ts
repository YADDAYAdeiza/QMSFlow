"use server"

import { db } from "@/db";
import { 
  companies, companyAffiliations, productLines, 
  products, applications, qmsTimelines, riskAssessments, users 
} from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { lodFormSchema } from "@/lib/validations";
import nodemailer from "nodemailer";

const RISK_CATEGORIES: Record<string, { complexity: number, criticality: number }> = {
  "VACCINES / BIOLOGICALS": { complexity: 3, criticality: 3 },
  "STERILE INJECTABLES": { complexity: 3, criticality: 2 },
  "POWDER BETA-LACTAMS": { complexity: 2, criticality: 3 },
  "TABLETS (GENERAL)": { complexity: 1, criticality: 2 },
  "MULTIVITAMINS": { complexity: 1, criticality: 1 },
};

const normalize = (str: string) => str?.trim().toUpperCase() || "";

// Configure your SMTP Transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true, // Configured to use explicit secure SSL/TLS connection pathway
  auth: {
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS, 
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false
  }
});

/**
 * Sends an email notification regarding an LOD application with active progress tracking.
 */
export async function sendDirectorOversightEmail(appDetails: {
  appNumber: string;
  type: string;
  companyName: string;
  facilityName: string;
  lodRemarks?: string;
  customRecipient?: string; // Support dynamic routing from the database if provided
}) {
  console.log("\n================ [EMAIL DISPATCH PIPELINE START] ================");
  console.log(`⏱️  Timestamp: ${new Date().toISOString()}`);
  console.log(`📥 Initiating dispatch for Application: ${appDetails.appNumber}`);
  
  try {
    const senderEmail = process.env.SMTP_USER;
    const directorEmail = appDetails.customRecipient || process.env.DIRECTOR_EMAIL || "director@nafdac.gov.ng";

    console.log(`👉 Configured Sender Account (SMTP_USER): ${senderEmail}`);
    console.log(`👉 Target Destination (DIRECTOR_EMAIL): ${directorEmail}`);
    console.log(`⚙️  SMTP Host Server: ${process.env.SMTP_HOST || "smtp.gmail.com"} on Port: ${process.env.SMTP_PORT || "465"}`);

    if (!senderEmail || !process.env.SMTP_PASS) {
      console.log("❌ ERROR: Missing SMTP credentials in Vercel / Environment settings!");
      return { success: false, error: "SMTP credentials are misconfigured." };
    }

    const mailOptions = {
      from: `"VMAP Digital Portal" <${senderEmail}>`,
      to: directorEmail,
      subject: `🚨 LIVE PROCESSING ALERT: Application #${appDetails.appNumber}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #0f172a; text-transform: uppercase; font-size: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            Director Oversight Notification
          </h2>
          <p style="font-size: 14px; color: #475569;">
            A high-priority application workflow has been initiated/updated within the VMAP portal.
          </p>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #64748b; width: 140px;">App Number:</td>
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
            ${appDetails.lodRemarks ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #64748b; vertical-align: top;">Specialist Notes:</td>
              <td style="padding: 8px 0; color: #475569; background: #f8fafc; padding: 10px; border-radius: 8px; font-style: italic;">
                "${appDetails.lodRemarks}"
              </td>
            </tr>
            ` : ""}
          </table>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">
            Veterinary Medicines Directorate (VMD) • QMS Automated Dispatch
          </p>
        </div>
      `,
    };

    console.log("⚡ Connecting to server and attempting handshake transmission...");
    const info = await transporter.sendMail(mailOptions);
    
    console.log("✅ SUCCESS: Email passed verification checks and handshakes completed!");
    console.log(`🆔 Message ID Reference: ${info.messageId}`);
    console.log("================ [EMAIL DISPATCH PIPELINE END] ================\n");
    return { success: true, messageId: info.messageId };

  } catch (error: any) {
    console.log("❌ CRITICAL FAILURE: Nodemailer was blocked by the host server!");
    console.error("📋 Error Breakdown Details:", error);
    console.log("================ [EMAIL DISPATCH PIPELINE END] ================\n");
    return { success: false, error: error.message || "Failed to dispatch email." };
  }
}

export async function submitLODApplication(
  rawData: any,
  userId: string, 
  userName: string, 
  userRole: string // Must evaluate to 'Divisional Deputy Director' as per formal QMS requirements
) {
  const validated = lodFormSchema.safeParse(rawData);
  if (!validated.success) return { success: false, error: "Validation Failed" };

  const data = validated.data;
  const normalizedAppNumber = normalize(data.appNumber);
  
  const shouldNotifyDirector = !!data.sendEmailNotification; 

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Context Fetching
      const existingApp = await tx.query.applications.findFirst({
        where: eq(applications.applicationNumber, normalizedAppNumber)
      });
      
      const submittingUser = await tx.query.users.findFirst({
        where: eq(users.id, userId)
      });

      const isUpdate = !!existingApp;
      const userDivision = submittingUser?.division || "LOD";
      const isActuallyRound2 = isUpdate && (existingApp.status === 'TECHNICAL_PASSED' || existingApp.details?.isComplianceReview === true);

      // 2. Upsert Companies (Master Data Protection)
      const upsertCompany = async (name: string, address: string, category: 'LOCAL' | 'FOREIGN') => {
        const cleanName = normalize(name);
        const cleanAddress = address?.trim() || "";

        const existing = await tx.query.companies.findFirst({
          where: and(
            eq(companies.name, cleanName), 
            eq(companies.category, category),
            eq(companies.address, cleanAddress)
          )
        });

        if (existing) return existing;

        const [inserted] = await tx.insert(companies).values({ 
          name: cleanName, 
          address: cleanAddress, 
          category 
        }).returning();

        return inserted;
      };

      const localComp = await upsertCompany(data.companyName, data.companyAddress, 'LOCAL');
      const foreignFact = await upsertCompany(data.facilityName, data.facilityAddress, 'FOREIGN');

      await tx.insert(companyAffiliations).values({ 
        localCompanyId: localComp.id, 
        foreignFactoryId: foreignFact.id 
      }).onConflictDoNothing();

      // 3. Products & Intrinsic Risk Calculation
      let maxComp = 1;
      let maxCrit = 1;

      for (const lineEntry of data.productLines) {
        const categoryKey = normalize(lineEntry.riskCategory);
        const risk = RISK_CATEGORIES[categoryKey];
        if (risk) {
          maxComp = Math.max(maxComp, risk.complexity);
          maxCrit = Math.max(maxCrit, risk.criticality);
        }

        const cleanLineName = normalize(lineEntry.lineName);
        const [lineRec] = await tx.insert(productLines)
          .values({ companyId: foreignFact.id, name: cleanLineName })
          .onConflictDoUpdate({ 
            target: [productLines.companyId, productLines.name], 
            set: { name: cleanLineName } 
          })
          .returning();

        if (lineEntry.products) {
          for (const prod of lineEntry.products) {
            await tx.insert(products).values({ 
              lineId: lineRec.id, 
              name: normalize(prod.name) 
            }).onConflictDoNothing();
          }
        }
      }

      // 4. Comment & Detail Threading
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
        comments: [...(existingDetails.comments || []), newComment],
        isComplianceReview: isActuallyRound2 
      };

      let appId: number;
      const targetPoint = 'Director Review';
      const nextStatus = isActuallyRound2 ? 'PENDING_DIRECTOR_FINAL' : 'PENDING_DIRECTOR';

      // 5. Unified Application & Timeline Logic
      if (isUpdate && existingApp) {
        appId = existingApp.id;
        
        await tx.update(applications)
          .set({
            status: nextStatus,
            currentPoint: targetPoint,
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
          companyId: localComp.id,
          foreignFactoryId: foreignFact.id,
          status: nextStatus,
          currentPoint: targetPoint,
          details: enhancedDetails
        }).returning();
        appId = newApp.id;
      }

      // Start the clock tracking system metrics as per QMS requirements
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        staffId: userId,
        division: userDivision as any, 
        point: targetPoint,
        startTime: sql`now()`
      });

      // 6. Risk Assessment Logic
      const score = maxComp * maxCrit;
      const level = score <= 2 ? "Low" : score <= 4 ? "Medium" : "High";

      await tx.insert(riskAssessments)
        .values({
          facilityId: foreignFact.id,
          applicationId: appId,
          complexityScore: maxComp,
          criticalityScore: maxCrit,
          intrinsicLevel: level,
          status: isActuallyRound2 ? 'DRAFT' : 'PARTIAL'
        })
        .onConflictDoUpdate({
          target: [riskAssessments.applicationId],
          set: {
            complexityScore: maxComp,
            criticalityScore: maxCrit,
            intrinsicLevel: level,
            updatedAt: sql`now()`
          }
        });

      revalidatePath("/dashboard/director");
      revalidatePath("/dashboard/lod");
      
      return { success: true, id: appId, appNumber: normalizedAppNumber, type: data.type, lodRemarks: data.lodRemarks, companyName: data.companyName, facilityName: data.facilityName };
    });

    // 7. AWAITED OUT-OF-TRANSACTION EMAIL DISPATCH (Prevents Vercel serverless worker execution truncation)
    if (result.success && shouldNotifyDirector) {
      const directorUser = await db.query.users.findFirst({
        where: and(eq(users.role, "Director"), eq(users.division, "VMAP"))
      });

      try {
        await sendDirectorOversightEmail({
          appNumber: result.appNumber,
          type: result.type,
          companyName: result.companyName,
          facilityName: result.facilityName,
          lodRemarks: result.lodRemarks,
          customRecipient: directorUser?.email // Falls back to process.env.DIRECTOR_EMAIL if missing
        });
      } catch (err) {
        console.error("Non-blocking notification system error captured at edge execution context:", err);
      }
    }

    return { success: true, id: result.id };
  } catch (e: any) {
    console.error("LOD Submission Error:", e);
    return { success: false, error: e.message };
  }
}

import { desc } from "drizzle-orm";

export async function getApplications() {
  try {
    const data = await db.query.applications.findMany({
      columns: {
        id: true,
        applicationNumber: true,
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