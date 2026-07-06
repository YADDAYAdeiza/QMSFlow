// app/api/send-email/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
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
    // 1. Add 'cc' to the extracted json parameters
    console.log('Is this endpoint even being called?')
    const { to, cc, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const mailOptions = {
      from: `"VMAP QMS Notifications" <${process.env.SMTP_USER}>`,
      to,
      cc, // 2. Pass it down here. If undefined, Nodemailer safely ignores it.
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: "Notification dispatched safely." });
  } catch (error: any) {
    console.error("Nodemailer service error:", error);
    return NextResponse.json({ error: error.message || "Failed to route mail." }, { status: 500 });
  }
}