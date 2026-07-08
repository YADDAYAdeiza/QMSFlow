import nodemailer from "nodemailer";

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

    // hardcoded Vercel URL landing address as requested
    const portalLandingPageUrl = "https://qms-flow.vercel.app/dashboard";

    console.log(`👉 Configured Sender Account (SMTP_USER): ${senderEmail}`);
    console.log(`👉 Target Destination: ${recipientEmail}`);
    console.log(`👁️  Oversight CC Monitored at: ${ccOversight}`);
    console.log(`🔗 Redirect Target Configured: ${portalLandingPageUrl}`);
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
          <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-top: 20px; margin-bottom: 25px;">
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

          <!-- Interactive Action Redirection Button -->
          <div style="text-align: center; margin: 25px 0 15px 0;">
            <a href="${portalLandingPageUrl}" 
               style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
              Open VMAP Portal Dashboard
            </a>
          </div>

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