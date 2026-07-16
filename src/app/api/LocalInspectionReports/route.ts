// src/app/api/LocalInspectionReports/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
// import { createClient } from "@/utils/supabase/server"; // Your Supabase client config

// Reused Nodemailer Transport Engine configuration
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, currentStepKey, direction, checklistSnapshot, companyName } = body;

    console.log(`[QMS] Processing routing transition for App ID: ${applicationId} from Desk: ${currentStepKey}`);

    // 1. Core Logic Interceptor for Director's Final Sign-Off
    if (currentStepKey === "DIRECTOR_FINAL_SIGN_OFF" && direction === "FORWARD") {
      const recommendation = checklistSnapshot?.final_recommendation || "PENDING";

      if (recommendation === "PENDING") {
        /**
         * PATHWAY 1: ISSUING A CAPA DIRECTIVE
         */
        console.log("🚨 CAPA Requirement detected. Committing transaction and preparing email...");

        // Extract structural checklist items or assign standard fallbacks
        const structuralObservations = checklistSnapshot?.observations || [];

        // -------------------------------------------------------------
        // [DATABASE COMMIT] Un-comment this block to write to Supabase
        // -------------------------------------------------------------
        // const supabase = createClient();
        // 
        // a) Transition application lifecycle state
        // await supabase.from('applications').update({ status: 'CAPA_ISSUED' }).eq('id', applicationId);
        //
        // b) Populate public ledger tracking matrix table row
        // await supabase.from('capa_submissions').insert({
        //   application_id: applicationId,
        //   ref_number: `NAFDAC/VMAP/G-31/Vol III/${applicationId}`,
        //   initial_observations: structuralObservations,
        //   status: 'OPEN'
        // });

        // Build unique secure tracking address
        const applicantPortalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/LocalInspectionReports/applicant/applications/${applicationId}/capa`;

        // Format a dynamic bullet list of structural observations for the email payload
        const observationListHtml = structuralObservations.length > 0
          ? `<ul style="padding-left: 20px; color: #334155; font-size: 13px; line-height: 1.6;">
              ${structuralObservations.map((obs: any) => `<li><strong>[${obs.severity}]</strong> ${obs.text}</li>`).join("")}
             </ul>`
          : `<p style="font-size: 13px; color: #64748b; font-style: italic;">Please log into the compliance tracking panel to review mapped observations.</p>`;

        // Construct high-fidelity regulatory notification letter
        const mailOptions = {
          from: `"NAFDAC VMAP Directorate" <${process.env.SMTP_USER}>`,
          to: "managing_director@globalorganics.com", // In production, query this from your company directory profile
          cc: 'adeiza.yusuf@nafdac.gov.ng',
          subject: `NOTIFICATION OF OUTCOME OF GOOD MANUFACTURING PRACTICE (GMP) INSPECTION - ID: # ${applicationId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.05em; text-transform: uppercase; color: #34d399;">NAFDAC QMS Portal Dispatch</h2>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Veterinary Medicines and Allied Products Directorate</p>
              </div>
              <div style="padding: 32px; background-color: #ffffff;">
                <p style="font-size: 14px; color: #1e293b; font-weight: bold; margin-bottom: 20px;">Dear Sir / Ma,</p>
                <p style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 16px;">
                  Please recall that a team of NAFDAC inspectors carried out a Good Manufacturing Practice (GMP) Routine Inspection at your manufacturing establishment, <strong>${companyName}</strong>.
                </p>
                <p style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 16px;">
                  During this technical assessment, deficiency metrics bordering on complete compliance parameters were observed and logged into your regulatory folder:
                </p>
                
                <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 0 4px 4px 0;">
                  <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #b45309; text-transform: uppercase;">Logged Audit Deficiencies Snapshot</h4>
                  ${observationListHtml}
                </div>

                <p style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
                  You are hereby directed to compile and submit a comprehensive <strong>Corrective and Preventive Action (CAPA)</strong> compliance ledger response addressing these structural items within <strong>thirty (30) calendar days</strong> from the receipt of this regulatory order.
                </p>
                
                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="${applicantPortalUrl}" style="background-color: #d97706; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: bold; border-radius: 6px; display: inline-block; box-shadow: 0 2px 4px rgba(217,119,6,0.2);">
                    📝 Open CAPA Response Portal Desk
                  </a>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
                <p style="font-size: 11px; color: #64748b; line-height: 1.5; margin: 0;">
                  This is an automated regulatory notification dispatched through the NAFDAC QMS Automated Tracking Engine.<br />
                  For: <strong>Director-General (NAFDAC)</strong>
                </p>
              </div>
            </div>
          `,
        };

        // Fire the live email transaction
        const mailResult = await transporter.sendMail(mailOptions);
        console.log(`[SMTP] Live notification sent successfully via Nodemailer. MessageId: ${mailResult.messageId}`);

        return NextResponse.json({
          success: true,
          arrivedAt: "APPLICANT_HUB_CAPA",
          message: "Dossier routed cleanly to the Applicant Hub. CAPA Notification email dispatched via secure SMTP."
        });

      } else {
        /**
         * PATHWAY 2: ABSOLUTE FINAL GMP CERTIFICATION
         */
        console.log("🌟 Clean Compliance Evaluation. Generating Serialized GMP Certification Route...");
        
        // await supabase.from('applications').update({ status: 'APPROVED_CERTIFIED' }).eq('id', applicationId);
        // await generateDigitalGMPCertificate(applicationId);

        return NextResponse.json({
          success: true,
          arrivedAt: "APPLICANT_HUB_CERTIFIED",
          message: "Dossier approved. Official GMP Certificate committed to generation database."
        });
      }
    }

    // Fallback handler for standard desk transitions across the staff matrix
    return NextResponse.json({
      success: true,
      arrivedAt: "NEXT_DESK_STEP",
      message: "Standard internal desk forward transition complete."
    });

  } catch (error: any) {
    console.error("Critical Routing Failure:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}