import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import fs from "fs";

// Common Windows Chrome paths
const WINDOWS_CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

function getLocalExecutablePath(): string {
  for (const path of WINDOWS_CHROME_PATHS) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  throw new Error(
    "No local Chrome or Edge browser found. Please install Google Chrome or Microsoft Edge."
  );
}

export async function POST(req: NextRequest) {
  try {
    const { reportHtml, docNumber } = await req.json();

    if (!reportHtml) {
      return NextResponse.json(
        { error: "Missing reportHtml payload." },
        { status: 400 }
      );
    }

    const isProduction = process.env.NODE_ENV === "production";

    // Launch headless Chromium configured for serverless / local environments
    const browser = await puppeteer.launch({
      args: isProduction
        ? chromium.args
        : ["--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: isProduction ? chromium.defaultViewport : null,
      executablePath: isProduction
        ? await chromium.executablePath()
        : getLocalExecutablePath(),
      headless: isProduction ? chromium.headless : true,
    });

    const page = await browser.newPage();

    const fullDocumentHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              font-family: Arial, sans-serif;
              color: #1e293b;
              -webkit-print-color-adjust: exact;
            }
          </style>
        </head>
        <body class="p-4 bg-white">
          ${reportHtml}
        </body>
      </html>
    `;

    await page.setContent(fullDocumentHtml, { waitUntil: "networkidle0" });

    // Generate A4 binary buffer
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
    });

    await browser.close();

    // Stream binary directly back to client
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${docNumber || "GMP_Inspection_Report"}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF Export Handler Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to render PDF binary." },
      { status: 500 }
    );
  }
}