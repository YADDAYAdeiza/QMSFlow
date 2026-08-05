// src/app/api/LocalInspectionReports/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import GMPCertificateView from "@/components/LocalInspectionReports/GMPCertificateView";
import CAPALetterView from "@/components/LocalInspectionReports/CAPALetterView"; 
import { extractInspectionData } from "@/lib/utils/inspectionReportUtils";
import { buildCompanyFilePath, uploadDossierFile } from "@/lib/utils/supabaseUpload";

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

/**
 * Helper utility to fetch a remote PDF from storage (Supabase) and convert to Buffer for Nodemailer
 */
async function fetchRemotePdfBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch remote PDF. Status: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error(`[PDF Fetch Error] Could not retrieve PDF from URL: ${url}`, err);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      applicationId, 
      currentStepKey, 
      direction, 
      pdfStorageUrl, 
      pdfReportUrl,
      pdfCertificateUrl 
    } = body;

    console.log('This is pdfCertificateUrl: ', pdfCertificateUrl);

    const {
      effectiveCompanyName,
      effectiveAddress,
      effectiveRecipientEmail,
      extractedLines,
      finalRecommendation,
      observations,
      certificateData
    } = extractInspectionData(body, applicationId);

    // Standard company ID fallback for directory paths
    const companyId = body.companyId || body.company_id || effectiveCompanyName || "UNKNOWN_COMPANY";

    console.log('This is certificateData: ', certificateData);
    console.log(`[QMS] Processing routing transition for App ID: ${applicationId} from Desk: ${currentStepKey}`);

    if (currentStepKey === "DIRECTOR_FINAL_SIGN_OFF" && direction === "FORWARD") {

      const reportPdfUrl = pdfReportUrl || pdfStorageUrl;

      if (finalRecommendation === "PENDING" || finalRecommendation === "CAPA_PENDING") {
        /**
         * PATHWAY 1: ISSUING A CAPA DIRECTIVE
         */
        console.log("🚨 CAPA Requirement detected. Preparing dual-document email dispatch...");

        const applicantPortalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/LocalInspectionReports/applicant/applications/${applicationId}/capa`;

        const observationListHtml = observations.length > 0
          ? `<ul style="padding-left: 20px; color: #334155; font-size: 13px; line-height: 1.6;">
              ${observations.map((obs: any) => `<li><strong>[${obs.severity || "DEFICIENCY"}]</strong> ${obs.text || obs.description || obs}</li>`).join("")}
             </ul>`
          : `<p style="font-size: 13px; color: #64748b; font-style: italic;">Please log into the compliance tracking panel to review mapped observations.</p>`;

        const attachments: any[] = [];
        let generatedCapaUrl = pdfCertificateUrl;

        // 1. Handle CAPA Letter Generation & Supabase Upload
        if (pdfCertificateUrl) {
          const capaRemoteBuffer = await fetchRemotePdfBuffer(pdfCertificateUrl);
          if (capaRemoteBuffer) {
            attachments.push({
              filename: `CAPA_Directive_Letter_${applicationId}.pdf`,
              content: capaRemoteBuffer,
              contentType: "application/pdf"
            });
          }
          console.log('Using first option...');
        } else {
          console.log('Using second option...');
          try {
            const capaBuffer = await renderToBuffer(
              React.createElement(CAPALetterView, { data: { ...body, certificateData, observations } }) as any
            );

            if (capaBuffer) {
              // Upload to Supabase Storage in '03_Certificates'
              const fileName = `CAPA_Directive_Letter_${applicationId}.pdf`;
              // const storagePath = buildCompanyFilePath(companyId, '', fileName);

              const storagePath = buildCompanyFilePath(
                      companyId,                         // 1st arg: companyId
                      '03_Certificates',    // 2nd arg: folder
                      fileName,                          // 3rd arg: fileName
                      applicationId                    // 4th arg: applicationId
                    );
              const blob = new Blob([capaBuffer], { type: 'application/pdf' });
              
              generatedCapaUrl = await uploadDossierFile(blob, storagePath);
              console.log(`[Supabase Storage] CAPA Letter saved to: ${generatedCapaUrl}`);

              attachments.push({
                filename: fileName,
                content: capaBuffer,
                contentType: "application/pdf"
              });
            }
          } catch (pdfErr) {
            console.error("CAPA Letter PDF Buffer / Upload Warning:", pdfErr);
          }
        }

        // 2. Fetch and attach Primary Inspection Report PDF
        if (reportPdfUrl) {
          const reportBuffer = await fetchRemotePdfBuffer(reportPdfUrl);
          if (reportBuffer) {
            attachments.push({
              filename: `Inspection_Report_${applicationId}.pdf`,
              content: reportBuffer,
              contentType: "application/pdf"
            });
          }
        }

        const mailOptions = {
          from: `"NAFDAC VMAP Directorate" <${process.env.SMTP_USER}>`,
          to: effectiveRecipientEmail,
          cc: "adeiza.yusuf@nafdac.gov.ng",
          subject: `NOTIFICATION OF OUTCOME OF GOOD MANUFACTURING PRACTICE (GMP) INSPECTION - ID: #${applicationId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 18px; text-transform: uppercase; color: #f59e0b;">NAFDAC Regulatory Notice</h2>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Veterinary Medicines and Allied Products Directorate</p>
              </div>
              <div style="padding: 32px; background-color: #ffffff;">
                <p style="font-size: 14px; color: #1e293b; font-weight: bold; margin-bottom: 4px;">The Managing Director,</p>
                <p style="font-size: 14px; color: #0f172a; font-weight: bold; margin-top: 0; margin-bottom: 4px;">${effectiveCompanyName}</p>
                <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 20px;">${effectiveAddress}</p>
                
                <p style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 16px;">
                  Please recall that a team of NAFDAC inspectors carried out a Good Manufacturing Practice (GMP) Routine Inspection at your facility, <strong>${effectiveCompanyName}</strong>.
                </p>
                <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
                  <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #b45309; text-transform: uppercase;">Logged Audit Deficiencies Snapshot</h4>
                  ${observationListHtml}
                </div>
                <p style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
                  You are hereby directed to compile and submit a comprehensive <strong>Corrective and Preventive Action (CAPA)</strong> response addressing these items within <strong>thirty (30) calendar days</strong>. Your official CAPA Directive Letter and Primary Inspection Report are attached to this email.
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
          attachments,
        };

        const mailResult = await transporter.sendMail(mailOptions);
        console.log(`[SMTP] CAPA email with attachments dispatched: ${mailResult.messageId}`);

        return NextResponse.json({
          success: true,
          arrivedAt: "APPLICANT_HUB_CAPA",
          capaUrl: generatedCapaUrl,
          message: "Dossier routed to CAPA hub; CAPA directive letter saved to storage and dispatched."
        });

      } else {
        /**
         * PATHWAY 2: ABSOLUTE FINAL GMP CERTIFICATION APPROVAL
         */
        console.log("🌟 Compliance Approved. Generating Digital Certification & Dispatching Approval Email...");

        const productLinesHtml = extractedLines.length > 0
          ? extractedLines.map((line: any) => `
              <li style="margin-bottom: 8px;">
                <strong>${line}</strong>
              </li>
            `).join("")
          : "<li>General Finished Product Manufacturing Line</li>";

        const attachments: any[] = [];
        let generatedCertUrl = pdfCertificateUrl;

        // 1. Handle GMP Certificate Generation & Supabase Upload
        if (pdfCertificateUrl) {
          const certRemoteBuffer = await fetchRemotePdfBuffer(pdfCertificateUrl);
          if (certRemoteBuffer) {
            attachments.push({
              filename: `GMP_Certificate_${applicationId}.pdf`,
              content: certRemoteBuffer,
              contentType: "application/pdf"
            });
          }
        } else {
          try {
            const certBuffer = await renderToBuffer(
              React.createElement(GMPCertificateView, { data: certificateData }) as any
            );

            if (certBuffer) {
              // Upload to Supabase Storage in '03_Certificates'
              const fileName = `GMP_Certificate_${applicationId}.pdf`;
              // const storagePath = buildCompanyFilePath(companyId, '03_Certificates', fileName);
              const storagePath = buildCompanyFilePath(
                      companyId,                         // 1st arg: companyId
                      '03_Certificates',    // 2nd arg: folder
                      fileName,                          // 3rd arg: fileName
                      applicationId                    // 4th arg: applicationId
                    )
              const blob = new Blob([certBuffer], { type: 'application/pdf' });

              generatedCertUrl = await uploadDossierFile(blob, storagePath);
              console.log(`[Supabase Storage] GMP Certificate saved to: ${generatedCertUrl}`);

              attachments.push({
                filename: fileName,
                content: certBuffer,
                contentType: "application/pdf"
              });
            }
          } catch (pdfErr) {
            console.error("GMP Certificate PDF Buffer / Upload Warning:", pdfErr);
          }
        }

        // 2. Fetch and attach Primary Inspection Report PDF
        if (reportPdfUrl) {
          const reportBuffer = await fetchRemotePdfBuffer(reportPdfUrl);
          if (reportBuffer) {
            attachments.push({
              filename: `Inspection_Report_${applicationId}.pdf`,
              content: reportBuffer,
              contentType: "application/pdf"
            });
          }
        }

        const mailOptions = {
          from: `"NAFDAC VMAP Directorate" <${process.env.SMTP_USER}>`,
          to: effectiveRecipientEmail,
          cc: "adeiza.yusuf@nafdac.gov.ng",
          subject: `GMP COMPLIANCE CERTIFICATION / NOTIFICATION OF OUTCOME - ID: #${applicationId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #004d00; padding: 24px; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 18px; text-transform: uppercase; color: #a7f3d0;">NAFDAC Approval Notice</h2>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #d1fae5;">Veterinary Medicines and Allied Products Directorate</p>
              </div>
              <div style="padding: 32px; background-color: #ffffff;">
                <p style="font-size: 14px; color: #1e293b; font-weight: bold; margin-bottom: 4px;">The Managing Director,</p>
                <p style="font-size: 14px; color: #0f172a; font-weight: bold; margin-top: 0; margin-bottom: 4px;">${effectiveCompanyName}</p>
                <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 20px;">${effectiveAddress}</p>

                <p style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 16px;">
                  We are pleased to inform you that following the technical evaluation of your facility, <strong>${effectiveCompanyName}</strong>, your establishment has been evaluated and found compliant with NAFDAC's Good Manufacturing Practice (GMP) standards.
                </p>

                <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin-bottom: 20px;">
                  <h4 style="margin: 0 0 4px 0; font-size: 12px; font-weight: bold; color: #15803d; text-transform: uppercase;">Status: GMP Compliant Approved</h4>
                  <p style="margin: 0; font-size: 12px; color: #166534;">Your official Notification of Outcome / Certificate and Inspection Report are attached to this email and available on your portal dashboard.</p>
                </div>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                  <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #334155; text-transform: uppercase;">Approved Scope & Product Lines:</h4>
                  <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #334155;">
                    ${productLinesHtml}
                  </ul>
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
          attachments,
        };

        const mailResult = await transporter.sendMail(mailOptions);
        console.log(`[SMTP] Approval email with dual attachments dispatched: ${mailResult.messageId}`);

        return NextResponse.json({
          success: true,
          arrivedAt: "APPLICANT_HUB_CERTIFIED",
          certificateUrl: generatedCertUrl,
          message: "Dossier approved; official certificate saved to storage and dispatched to applicant."
        });
      }
    }

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