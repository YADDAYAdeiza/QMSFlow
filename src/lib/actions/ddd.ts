"use server"

import { db } from "@/db";
import { 
  companies, companyAffiliations, productLines, 
  products, applications, qmsTimelines, riskAssessments, users 
} from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { calculateORR } from "@/lib/actions/riskEngine"; 
import { createClient } from "@/utils/supabase/server";
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
 * Sends an email notification regarding a file tracking movement with active progress logging.
 * Modified to include an automatic CC line for oversight tracking.
 */
export async function sendOversightEmail(appDetails: {
  appNumber: string;
  type: string;
  companyName: string;
  facilityName: string;
  lodRemarks?: string;
  customRecipient?: string; 
}) {
  console.log("\n================ [EMAIL DISPATCH PIPELINE START] ================");
  console.log(`⏱️  Timestamp: ${new Date().toISOString()}`);
  console.log(`📥 Initiating dispatch for Application: ${appDetails.appNumber}`);
  
  try {
    const senderEmail = process.env.SMTP_USER;
    const recipientEmail = appDetails.customRecipient || process.env.DIRECTOR_EMAIL || "director@nafdac.gov.ng";
    
    // Explicit oversight copy target
    const ccOversight = "adeiza.yusuf@nafdac.gov.ng";

    console.log(`👉 Configured Sender Account (SMTP_USER): ${senderEmail}`);
    console.log(`👉 Target Destination: ${recipientEmail}`);
    console.log(`👁️  Oversight CC Monitored at: ${ccOversight}`);
    console.log(`⚙️  SMTP Host Server: ${process.env.SMTP_HOST || "smtp.gmail.com"} on Port: ${process.env.SMTP_PORT || "465"}`);

    if (!senderEmail || !process.env.SMTP_PASS) {
      console.log("❌ ERROR: Missing SMTP credentials in Environment settings!");
      return { success: false, error: "SMTP credentials are misconfigured." };
    }
    console.log('Sent to: ', recipientEmail);
    const mailOptions = {
      from: `"VMAP Digital Portal" <${senderEmail}>`,
      to: recipientEmail,
      cc: ccOversight, // Injected CC parameter here for persistent tracking
      subject: `🚨 LIVE PROCESSING ALERT: Application #${appDetails.appNumber}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #0f172a; text-transform: uppercase; font-size: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            Dossier Workflow Notification
          </h2>
          <p style="font-size: 14px; color: #475569;">
            A high-priority application workflow milestone has been recorded within the VMAP portal.
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

/**
 * DD -> Staff: Moves the file to the staff's desk for technical work.
 */
export async function assignToStaff(appId: number, staffId: string, remarks: string) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Fetch Staff Details
      const staffMember = await tx.query.users.findFirst({
        where: eq(users.id, staffId)
      });

      if (!staffMember) throw new Error("Staff member not found");

      // 2. Fetch Application
      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, appId) 
      });
      if (!app) throw new Error("Application not found");

      const oldDetails = (app.details as any) || {};
      const timestamp = new Date();

      const isIRSD = staffMember.division === "IRSD";
      const targetPoint = isIRSD ? "IRSD Staff Vetting" : "Staff Technical Review";
      const targetStatus = isIRSD ? "UNDER_HUB_VETTING" : "UNDER_TECHNICAL_REVIEW";

      const currentAssignedId = isIRSD ? oldDetails.irsd_reviewer_id : oldDetails.staff_reviewer_id;
      const isReassignment = !!currentAssignedId;
      
      const displayAction = isIRSD 
        ? (isReassignment ? "REASSIGNED_HUB_VETTER" : "ASSIGNED_FOR_HUB_VETTING")
        : (isReassignment ? "REASSIGNED_TECHNICAL_STAFF" : "ASSIGNED_TO_TECHNICAL_STAFF");

      // 3. CLOSE ANY EXISTING OPEN CLOCKS
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId), 
          isNull(qmsTimelines.endTime)
        ));

      // 4. LOG IN COMMENTS
      const assignmentComment = {
        from: `Divisional Deputy Director (${staffMember.division})`,
        role: "Divisional Deputy Director",
        division: staffMember.division,
        text: remarks,
        action: displayAction,
        timestamp: timestamp.toISOString()
      };

      // 5. UPDATE APPLICATION
      const updatedDetails = {
        ...oldDetails,
        comments: [...(oldDetails.comments || []), assignmentComment]
      };

      if (isIRSD) {
        updatedDetails.irsd_reviewer_id = staffId;
      } else {
        updatedDetails.staff_reviewer_id = staffId;
      }

      await tx.update(applications)
        .set({
          currentPoint: targetPoint,
          status: targetStatus,
          updatedAt: timestamp,
          details: updatedDetails
        })
        .where(eq(applications.id, appId));

      // 6. START NEW CLOCK
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: targetPoint,
        staffId: staffId, 
        division: staffMember.division,
        startTime: timestamp,
      });

      // 7. FIRE-AND-FORGET NOTIFICATION TO ASSIGNED REVIEWER
      if (staffMember.email) {
        sendOversightEmail({
          appNumber: app.applicationNumber || `APP-${app.id}`,
          type: app.type || "Dossier Evaluation",
          companyName: oldDetails.applicantCompanyName || "N/A",
          facilityName: oldDetails.manufacturingSiteName || "N/A",
          lodRemarks: remarks,
          customRecipient: staffMember.email
        }).catch(err => console.error("Non-blocking email failure:", err));
      }

      revalidatePath('/dashboard/ddd');
      revalidatePath('/dashboard/staff');
      return { success: true };
    });
  } catch (error: any) {
    console.error("ASSIGN_TO_STAFF_ERROR:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper to find the Director (VMAP)
 */
async function getDirectorDetails() {
  return await db.query.users.findFirst({
    where: (u, { and, eq }) => and(
      eq(u.role, 'Director'),
      eq(u.division, 'DIRECTORATE')
    )
  });
}

/**
 * DD -> IRSD (Hub) OR DD IRSD -> Director (Final)
 */
export async function approveToDirector(
  appId: number, 
  recommendationNote: string, 
  loggedInUserId: string
) {
  try {
    return await db.transaction(async (tx) => {
      const actingUser = await tx.query.users.findFirst({ 
        where: (u, { eq }) => eq(u.id, loggedInUserId) 
      });
      if (!actingUser) throw new Error("Acting User not found");

      const isIRSD = actingUser.division === "IRSD";
      
      const nextPoint = isIRSD ? "Director Final Review" : "IRSD Hub Clearance";
      const nextStatus = isIRSD ? "PENDING_DIRECTOR_APPROVAL" : "UNDER_HUB_CLEARANCE";
      const actionLabel = isIRSD ? "ENDORSED_FOR_DIRECTOR_SIGN_OFF" : "TECHNICAL_CONCURRENCE_FORWARDED_TO_HUB";
      
      const dbTimestamp = new Date();

      if (isIRSD) {
        const riskRecord = await tx.query.riskAssessments.findFirst({
          where: (ra, { eq }) => eq(ra.applicationId, appId)
        });

        if (riskRecord?.intrinsicLevel && riskRecord?.complianceLevel) {
          const rating = riskRecord.intrinsicLevel === 'High' || riskRecord.complianceLevel === 'High' ? 'High' : 'Medium';
          const interval = rating === 'High' ? 6 : 12;

          const nextDate = new Date();
          nextDate.setMonth(nextDate.getMonth() + interval);

          await tx.update(riskAssessments).set({
            overallRiskRating: rating,
            nextInspectionDate: nextDate,
            status: "FINALIZED",
            updatedAt: dbTimestamp
          }).where(eq(riskAssessments.applicationId, appId));
        }
      }

      let nextOwnerId: string | null = null;
      let targetNotificationEmail: string | undefined = undefined;

      if (isIRSD) {
        const director = await getDirectorDetails();
        nextOwnerId = director?.id || null;
        targetNotificationEmail = director?.email || undefined;
      } else {
        const irsdDD = await tx.query.users.findFirst({
          where: (u, { and, eq }) => and(
            eq(u.division, 'IRSD'), 
            eq(u.role, 'Divisional Deputy Director')
          )
        });
        nextOwnerId = irsdDD?.id || null;
        targetNotificationEmail = irsdDD?.email || undefined;
      }

      const app = await tx.query.applications.findFirst({ where: eq(applications.id, appId) });
      if (!app) throw new Error("Application record missing");
      
      const oldDetails = (app.details as any) || {};
      const reportForDirector = oldDetails.verificationReportUrl || oldDetails.technicalAssessmentUrl;

      const newEntry = {
        from: actingUser.name,
        role: "Divisional Deputy Director",
        division: actingUser.division,
        text: recommendationNote,
        timestamp: dbTimestamp.toISOString(),
        action: actionLabel,
        referenceReport: reportForDirector 
      };

      await tx.update(applications)
        .set({
          currentPoint: nextPoint,
          status: nextStatus,
          details: { 
            ...oldDetails, 
            comments: [...(oldDetails.comments || []), newEntry],
            lastEndorsedBy: actingUser.id,
            finalRecommendationReport: reportForDirector
          },
          updatedAt: dbTimestamp
        })
        .where(eq(applications.id, appId));

      await tx.update(qmsTimelines)
        .set({ endTime: dbTimestamp })
        .where(and(eq(qmsTimelines.applicationId, appId), isNull(qmsTimelines.endTime)));

      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: nextPoint,
        division: isIRSD ? "DIRECTORATE" : "IRSD", 
        staffId: nextOwnerId, 
        startTime: dbTimestamp,
      });

      // 7. DISPATCH TO EXECUTIVE MANAGEMENT RECIPIENT
      if (targetNotificationEmail) {
        sendOversightEmail({
          appNumber: app.applicationNumber || `APP-${app.id}`,
          type: app.type || "Executive Clearance",
          companyName: oldDetails.applicantCompanyName || "N/A",
          facilityName: oldDetails.manufacturingSiteName || "N/A",
          lodRemarks: recommendationNote,
          customRecipient: targetNotificationEmail
        }).catch(err => console.error("Non-blocking executive email failure:", err));
      }

      revalidatePath('/dashboard/ddd');
      revalidatePath('/dashboard/director'); 
      
      return { success: true };
    });
  } catch (error: any) {
    console.error("APPROVE_TO_DIRECTOR_ERROR:", error);
    return { success: false, error: error.message };
  }
}

/**
 * DD -> Staff (Return for Rework)
 */
export async function returnToStaff(
  appId: number, 
  targetStaffId: string,
  rejectionReason: string, 
  currentDDId: string 
) {
  const timestamp = new Date();
  try {
    const ddUser = await db.query.users.findFirst({ 
      where: eq(users.id, currentDDId) 
    });
    
    if (!ddUser) throw new Error("Divisional Deputy Director user not found");

    return await db.transaction(async (tx) => {
      const staffMember = await tx.query.users.findFirst({
        where: eq(users.id, targetStaffId)
      });

      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, appId) 
      });
      if (!app) throw new Error("Application not found");

      const oldDetails = (app.details as any) || {};
      const oldComments = oldDetails.comments || [];
      const nextRound = (oldDetails.currentRound || 1) + 1;

      const isIRSD = ddUser.division === "IRSD";
      const targetPoint = isIRSD ? "IRSD Staff Vetting" : "Staff Technical Review";
      const targetStatus = isIRSD ? "HUB_VETTING_REWORK" : "PENDING_REWORK";

      const reworkEntry = {
        from: ddUser.name,
        role: "Divisional Deputy Director",
        division: ddUser.division,
        text: rejectionReason,
        timestamp: timestamp.toISOString(),
        round: nextRound,
        action: "REWORK_REQUIRED",
        frozenFindings: oldDetails.findings_ledger || [],
        frozenReport: oldDetails.inspectionReportUrl || oldDetails.verificationReportUrl
      };

      const updatedDetails = {
        ...oldDetails,
        currentRound: nextRound,
        comments: [...oldComments, reworkEntry]
      };

      if (isIRSD) {
        updatedDetails.irsd_reviewer_id = targetStaffId;
      } else {
        updatedDetails.staff_reviewer_id = targetStaffId;
      }

      await tx.update(applications)
        .set({
          currentPoint: targetPoint, 
          status: targetStatus,
          details: updatedDetails as any,
          updatedAt: timestamp
        })
        .where(eq(applications.id, appId));

      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          isNull(qmsTimelines.endTime)
        ));

      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        staffId: targetStaffId,
        division: ddUser.division,
        point: targetPoint,
        startTime: timestamp,
      });

      // SEND REWORK NOTIFICATION TO ASSIGNED REWORK STAFF MEMBER
      if (staffMember?.email) {
        sendOversightEmail({
          appNumber: app.applicationNumber || `APP-${app.id}`,
          type: "Rework Directive Required",
          companyName: oldDetails.applicantCompanyName || "N/A",
          facilityName: oldDetails.manufacturingSiteName || "N/A",
          lodRemarks: rejectionReason,
          customRecipient: staffMember.email
        }).catch(err => console.error("Non-blocking email failure during returnToStaff:", err));
      }

      revalidatePath(`/dashboard/ddd`);
      revalidatePath(`/dashboard/staff`);
      return { success: true };
    });
  } catch (error: any) {
    console.error("REWORK_ACTION_ERROR:", error);
    return { success: false, error: error.message };
  }
}

/**
 * DD IRSD -> IRSD Staff (Internal Hub Vetting)
 */
export async function assignToIRSDStaff(appId: number, irsdStaffId: string, instruction: string) {
  try {
    return await db.transaction(async (tx) => {
      const irsdStaff = await tx.query.users.findFirst({
        where: and(eq(users.id, irsdStaffId), eq(users.division, 'IRSD'))
      });
      if (!irsdStaff) throw new Error("IRSD Staff member not found");

      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, appId) 
      });
      if (!app) throw new Error("Application not found");

      const oldDetails = (app.details as any) || {};
      const timestamp = new Date();

      const vettingComment = {
        from: "IRSD Deputy Director",
        role: "Divisional Deputy Director",
        division: "IRSD",
        text: instruction,
        action: "ASSIGNED_FOR_HUB_VETTING",
        timestamp: timestamp.toISOString()
      };

      await tx.update(applications)
        .set({
          currentPoint: "IRSD Staff Vetting",
          status: "UNDER_HUB_VETTING",
          updatedAt: timestamp,
          details: { 
            ...oldDetails, 
            irsd_reviewer_id: irsdStaffId, 
            comments: [...(oldDetails.comments || []), vettingComment] 
          }
        })
        .where(eq(applications.id, appId));

      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId), 
          isNull(qmsTimelines.endTime)
        ));

      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: "IRSD Staff Vetting",
        staffId: irsdStaffId, 
        division: "IRSD",
        startTime: timestamp,
      });

      if (irsdStaff.email) {
        sendOversightEmail({
          appNumber: app.applicationNumber || `APP-${app.id}`,
          type: "IRSD Hub Vetting Assignment",
          companyName: oldDetails.applicantCompanyName || "N/A",
          facilityName: oldDetails.manufacturingSiteName || "N/A",
          lodRemarks: instruction,
          customRecipient: irsdStaff.email
        }).catch(err => console.error("Non-blocking internal IRSD staff email failure:", err));
      }

      revalidatePath('/dashboard/ddd');
      return { success: true };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Forward Technical Concurrence to IRSD Hub
 */
export async function forwardToHub(appId: number, remarks: string) {
  try {
    return await db.transaction(async (tx) => {
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId)
      });
      if (!app) throw new Error("Application not found");

      const hubDD = await tx.query.users.findFirst({
        where: and(
          eq(users.division, "IRSD"),
          eq(users.role, "Divisional Deputy Director")
        )
      });

      if (!hubDD) throw new Error("Divisional Deputy Director (IRSD) not found in the system. Cannot open QMS clock.");

      const oldDetails = (app.details as any) || {};
      const timestamp = new Date();

      const hubComment = {
        from: `Divisional Deputy Director (${app.division})`,
        role: "Divisional Deputy Director",
        division: app.division,
        text: remarks,
        action: "FORWARDED_TO_IRSD_HUB",
        timestamp: timestamp.toISOString()
      };

      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          isNull(qmsTimelines.endTime)
        ));

      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: "IRSD Hub Clearance",
        staffId: hubDD.id, 
        division: "IRSD",
        startTime: timestamp,
      });

      await tx.update(applications)
        .set({
          currentPoint: "IRSD Hub Clearance",
          status: "PENDING_HUB_CLEARANCE",
          updatedAt: timestamp,
          details: {
            ...oldDetails,
            comments: [...(oldDetails.comments || []), hubComment]
          }
        })
        .where(eq(applications.id, appId));

      if (hubDD.email) {
        sendOversightEmail({
          appNumber: app.applicationNumber || `APP-${app.id}`,
          type: "Technical Concurrence Forwarded",
          companyName: oldDetails.applicantCompanyName || "N/A",
          facilityName: oldDetails.manufacturingSiteName || "N/A",
          lodRemarks: remarks,
          customRecipient: hubDD.email
        }).catch(err => console.error("Non-blocking cross-division hub email failure:", err));
      }

      revalidatePath('/dashboard/ddd');
      return { success: true };
    });
  } catch (error: any) {
    console.error("FORWARD_TO_HUB_ERROR:", error);
    return { success: false, error: error.message };
  }
}

/**
 * RECALL PROTOCOL
 */
export async function recallApplication(applicationId: string, actingDivision: string) {
  const supabase = await createClient(); 
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Unauthorized: Executive credentials required.");
  }

  const loggedInUserId = session.user.id;
  const numericAppId = Number(applicationId);
  const divisionKey = actingDivision.toUpperCase();
  const timestamp = new Date();

  const recallPoint = divisionKey === "IRSD" 
    ? "IRSD Hub Clearance" 
    : "Technical DD Review";

  try {
    await db.transaction(async (tx) => {
      const [activeTimeline] = await tx
        .select()
        .from(qmsTimelines)
        .where(
          and(
            eq(qmsTimelines.applicationId, numericAppId),
            eq(qmsTimelines.division, divisionKey),
            isNull(qmsTimelines.endTime)
          )
        )
        .limit(1);

      if (!activeTimeline) {
        throw new Error("Recall Handshake Failed: No active staff review found.");
      }

      const [app] = await tx
        .select()
        .from(applications)
        .where(eq(applications.id, numericAppId))
        .limit(1);

      const details = (app.details as any) || {};
      const updatedComments = [
        ...(details.comments || []),
        {
          from: divisionKey === "IRSD" ? "Divisional Deputy Director (IRSD)" : "Divisional Deputy Director",
          role: "Divisional Deputy Director",
          text: `QMS RECALL: File retrieved from staff (Staff ID: ${activeTimeline.staffId}) and returned to ${recallPoint}.`,
          action: "RECALL_TO_DESK",
          timestamp: timestamp.toISOString(),
        },
      ];

      await tx
        .update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(eq(qmsTimelines.id, activeTimeline.id));

      await tx
        .update(applications)
        .set({
          currentPoint: recallPoint,
          details: { ...details, comments: updatedComments },
        })
        .where(eq(applications.id, numericAppId));

      await tx.insert(qmsTimelines).values({
        applicationId: numericAppId,
        staffId: loggedInUserId,
        division: divisionKey,
        startTime: timestamp,
      });
    });

    revalidatePath("/dashboard/ddd");
    return { success: true };
  } catch (error) {
    console.error("Critical Recall Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Handshake failed during recall." 
    };
  }
}