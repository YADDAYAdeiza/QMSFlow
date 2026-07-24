// src/app/api/LocalInspectionReports/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import GMPCertificateView from "@/components/LocalInspectionReports/GMPCertificateView";
// import { createClient } from "@/utils/supabase/server"; 

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, currentStepKey, direction, checklistSnapshot, companyName, facilityAddress } = body;

    console.log(`[QMS] Processing routing transition for App ID: ${applicationId} from Desk: ${currentStepKey}`);

    // Core Interceptor for Director's Final Sign-Off
    if (currentStepKey === "DIRECTOR_FINAL_SIGN_OFF" && direction === "FORWARD") {
      const recommendation = checklistSnapshot?.final_recommendation || "PENDING";

      if (recommendation === "PENDING") {
        /**
         * PATHWAY 1: ISSUING A CAPA DIRECTIVE
         */
        console.log("🚨 CAPA Requirement detected. Preparing email dispatch...");

        const structuralObservations = checklistSnapshot?.observations || [];
        const applicantPortalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/LocalInspectionReports/applicant/applications/${applicationId}/capa`;

        const observationListHtml = structuralObservations.length > 0
          ? `<ul style="padding-left: 20px; color: #334155; font-size: 13px; line-height: 1.6;">
              ${structuralObservations.map((obs: any) => `<li><strong>[${obs.severity}]</strong> ${obs.text}</li>`).join("")}
             </ul>`
          : `<p style="font-size: 13px; color: #64748b; font-style: italic;">Please log into the compliance tracking panel to review mapped observations.</p>`;

        const mailOptions = {
          from: `"NAFDAC VMAP Directorate" <${process.env.SMTP_USER}>`,
          to: "managing_director@globalorganics.com", // Query applicant email dynamically in production
          cc: "adeiza.yusuf@nafdac.gov.ng",
          subject: `NOTIFICATION OF OUTCOME OF GOOD MANUFACTURING PRACTICE (GMP) INSPECTION - ID: #${applicationId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 18px; text-transform: uppercase; color: #f59e0b;">NAFDAC Regulatory Notice</h2>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Veterinary Medicines and Allied Products Directorate</p>
              </div>
              <div style="padding: 32px; background-color: #ffffff;">
                <p style="font-size: 14px; color: #1e293b; font-weight: bold; margin-bottom: 20px;">Dear Sir / Ma,</p>
                <p style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 16px;">
                  Please recall that a team of NAFDAC inspectors carried out a Good Manufacturing Practice (GMP) Routine Inspection at your facility, <strong>${companyName}</strong>.
                </p>
                <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
                  <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #b45309; text-transform: uppercase;">Logged Audit Deficiencies Snapshot</h4>
                  ${observationListHtml}
                </div>
                <p style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
                  You are hereby directed to compile and submit a comprehensive <strong>Corrective and Preventive Action (CAPA)</strong> response addressing these items within <strong>thirty (30) calendar days</strong>.
                </p>
                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="${applicantPortalUrl}" style="background-color: #d97706; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: bold; border-radius: 6px; display: inline-block;">
                    📝 Open CAPA Response Portal
                  </a>
                </div>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
                <p style="font-size: 11px; color: #64748b; margin: 0;">
                  Automated regulatory notification via NAFDAC QMS Engine.<br />
                  For: <strong>Director-General (NAFDAC)</strong>
                </p>
              </div>
            </div>
          `,
        };

        const mailResult = await transporter.sendMail(mailOptions);
        console.log(`[SMTP] CAPA email dispatched: ${mailResult.messageId}`);

        return NextResponse.json({
          success: true,
          arrivedAt: "APPLICANT_HUB_CAPA",
          message: "Dossier routed to CAPA hub and notification email dispatched."
        });

      } else {
        /**
         * PATHWAY 2: ABSOLUTE FINAL GMP CERTIFICATION APPROVAL
         */
        console.log("🌟 Compliance Approved. Generating Digital Certification & Dispatching Approval Email...");

        const certificateData = {
          appNumber: `NAFDAC/VMAP/GMP/${applicationId}`,
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          facilityName: companyName || "Registered Establishment",
          facilityAddress: facilityAddress || "Registered Facility Address",
          productLines: checklistSnapshot?.productLines || [],
          signatoryName: "Divisional Deputy Director",
          signatoryTitle: "Divisional Deputy Director, Veterinary Medicine & Allied Products"
        };

        // Render PDF to buffer server-side to attach directly to email
        let pdfBuffer: Buffer | null = null;
        try {
          pdfBuffer = await renderToBuffer(
            React.createElement(GMPCertificateView, { data: certificateData }) as any
          );
        } catch (pdfErr) {
          console.error("PDF Buffer Rendering Warning:", pdfErr);
        }

        const mailOptions = {
          from: `"NAFDAC VMAP Directorate" <${process.env.SMTP_USER}>`,
          to: "managing_director@globalorganics.com", // Query applicant email dynamically in production
          cc: "adeiza.yusuf@nafdac.gov.ng",
          subject: `GMP COMPLIANCE CERTIFICATION / NOTIFICATION OF OUTCOME - ID: #${applicationId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #004d00; padding: 24px; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 18px; text-transform: uppercase; color: #a7f3d0;">NAFDAC Approval Notice</h2>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #d1fae5;">Veterinary Medicines and Allied Products Directorate</p>
              </div>
              <div style="padding: 32px; background-color: #ffffff;">
                <p style="font-size: 14px; color: #1e293b; font-weight: bold; margin-bottom: 20px;">Dear Sir / Ma,</p>
                <p style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 16px;">
                  We are pleased to inform you that following the technical evaluation of your facility, <strong>${companyName}</strong>, your establishment has been evaluated and found compliant with NAFDAC's Good Manufacturing Practice (GMP) standards.
                </p>
                <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin-bottom: 24px;">
                  <h4 style="margin: 0 0 4px 0; font-size: 12px; font-weight: bold; color: #15803d; text-transform: uppercase;">Status: GMP Compliant Approved</h4>
                  <p style="margin: 0; font-size: 12px; color: #166534;">Your official Notification of Outcome / Certificate is attached to this email and available on your portal dashboard.</p>
                </div>
                <p style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
                  This approval is valid for three (3) years from the date of final sign-off, subject to continued regulatory compliance.
                </p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
                <p style="font-size: 11px; color: #64748b; margin: 0;">
                  Official Notification dispatched via NAFDAC QMS Automated Tracking Engine.<br />
                  For: <strong>Director-General (NAFDAC)</strong>
                </p>
              </div>
            </div>
          `,
          attachments: pdfBuffer ? [
            {
              filename: `GMP_Certificate_${applicationId}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf"
            }
          ] : []
        };

        const mailResult = await transporter.sendMail(mailOptions);
        console.log(`[SMTP] Approval email dispatched: ${mailResult.messageId}`);

        return NextResponse.json({
          success: true,
          arrivedAt: "APPLICANT_HUB_CERTIFIED",
          message: "Dossier approved and official notification dispatched to applicant."
        });
      }
    }

    // Default internal routing
    return NextResponse.json({
      success: true,
      arrivedAt: "NEXT_DESK_STEP",
      message: "Standard internal desk transition complete."
    });

  } catch (error: any) {
    console.error("Critical Routing Failure:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}