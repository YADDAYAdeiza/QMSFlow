"use server";

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function extractReceiptDataWithGemini(pdfUrl: string) {
  if (!pdfUrl) return null;
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

    for (const modelName of modelsToTry) {
      try {
        const aiResponse = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data
              }
            },
            {
              text: `Analyze this NAFDAC payment receipt document. Extract and return ONLY a JSON object with these exact keys:
              {
                "paymentDate": "string (e.g. 22 Jul, 2025 or null if not found)",
                "amount": number or null if not found,
                "receiptNo": "string or null if not found",
                "rrr": "string or null if not found",
                "companyName": "string or null if not found",
                "isHalfPayment": boolean
              }`
            }
          ]
        });

        const textResult = aiResponse.text;
        if (textResult) {
          const cleanJson = textResult.replace(/```json/g, "").replace(/```/g, "").trim();
          return JSON.parse(cleanJson);
        }
      } catch (err) {
        // try next model
      }
    }
    return null;
  } catch (err) {
    console.error("Gemini Forensic Vision OCR Error:", err);
    return null;
  }
}

export async function executeForensicAuditAction(details: any) {
  const comments = details?.comments || [];
  
  const result: any = {
    isDeskReview: false,
    detectedAmount: null,
    fullPaymentDate: null,
    expiryDate: null,
    receiptCompanyName: null,
    hasValidFullPaymentProof: true,
    flags: []
  };

  try {
    const intakePdfUrl = details?.poaUrl;
    const verificationUrl = details?.verificationReportUrl;

    // 1. Extract Intake / Half Payment Receipt Data
    const intakeReceiptData = await extractReceiptDataWithGemini(intakePdfUrl);
    
    const commentBlob = comments.map((c: any) => c.text || "").join(" ").toLowerCase();
    const commentMentionsDesk = commentBlob.includes("desk review") || commentBlob.includes("half payment");
    const geminiSaysDesk = intakeReceiptData?.isHalfPayment || (intakeReceiptData?.amount && intakeReceiptData.amount >= 7000000 && intakeReceiptData.amount <= 9000000);

    result.isDeskReview = !!geminiSaysDesk || commentMentionsDesk;
    result.detectedAmount = intakeReceiptData?.amount || null;
    result.receiptCompanyName = intakeReceiptData?.companyName || null;

    if (result.isDeskReview) {
      const hasProof = !!verificationUrl && verificationUrl.trim() !== "";
      result.hasValidFullPaymentProof = hasProof;

      if (!hasProof) {
        result.flags.push({
          severity: "CRITICAL",
          code: "MISSING_FULL_PAYMENT_PROOF",
          message: "INCONSISTENCY ALERT: Application is classified as a Desk Review (Half Payment), but the required evidence of prior Full Payment is completely missing."
        });
      } else {
        // 2. Extract Full Payment Receipt Data
        const fullPaymentReceiptData = await extractReceiptDataWithGemini(verificationUrl);

        if (!fullPaymentReceiptData) {
          result.flags.push({
            severity: "CRITICAL",
            code: "FULL_PAYMENT_OCR_FAILED",
            message: "FRAUD ALERT: Could not read or process the uploaded Full Payment verification document."
          });
          return result;
        }

        // --- SECURITY RULE: CHECK FOR RE-UPLOADED SAME RECEIPT (DUPLICATE PARAMS) ---
        const sameReceiptNo = intakeReceiptData?.receiptNo && fullPaymentReceiptData?.receiptNo && 
                              intakeReceiptData.receiptNo.trim().toLowerCase() === fullPaymentReceiptData.receiptNo.trim().toLowerCase();
        
        const sameRrr = intakeReceiptData?.rrr && fullPaymentReceiptData?.rrr && 
                        intakeReceiptData.rrr.trim().toLowerCase() === fullPaymentReceiptData.rrr.trim().toLowerCase();

        if (sameReceiptNo || sameRrr) {
          result.flags.push({
            severity: "CRITICAL",
            code: "DUPLICATE_RECEIPT_FRAUD",
            message: `FRAUD ALERT: The same receipt identifier (Receipt No: ${fullPaymentReceiptData.receiptNo || 'N/A'}, RRR: ${fullPaymentReceiptData.rrr || 'N/A'}) was re-uploaded for both intake and full payment proofs.`
          });
          return result;
        }

        // --- SECURITY RULE: AMOUNT LOGIC VERIFICATION ---
        if (intakeReceiptData?.amount && fullPaymentReceiptData?.amount) {
          const ratio = fullPaymentReceiptData.amount / intakeReceiptData.amount;
          // Expecting full payment to be roughly double (e.g., between 1.8x and 2.2x)
          if (ratio < 1.7 || ratio > 2.3) {
            result.flags.push({
              severity: "WARNING",
              code: "PAYMENT_AMOUNT_DISCREPANCY",
              message: `VALUATION WARNING: Full payment amount (₦${fullPaymentReceiptData.amount.toLocaleString()}) is not proportional to the half-payment amount (₦${intakeReceiptData.amount.toLocaleString()}). Please verify manually.`
            });
          }
        }

        // 3. Expiry Window Audit based on verified unique Full Payment Date
        if (fullPaymentReceiptData.paymentDate) {
          result.fullPaymentDate = fullPaymentReceiptData.paymentDate;
          const paymentDateObj = new Date(fullPaymentReceiptData.paymentDate);
          const expiryDateObj = new Date(paymentDateObj);
          expiryDateObj.setFullYear(expiryDateObj.getFullYear() + 3);

          result.expiryDate = expiryDateObj.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });

          if (new Date() > expiryDateObj) {
            result.flags.push({
              severity: "CRITICAL",
              code: "EXPIRED_FULL_PAYMENT_BASELINE",
              message: `FRAUD / EXPIRY ALERT: Original Full Payment date was ${result.fullPaymentDate}. The 3-year validation window expired on ${result.expiryDate}.`
            });
          } else {
            result.flags.push({
              severity: "INFO",
              code: "VALID_FULL_PAYMENT_BASELINE",
              message: `VERIFIED: Original Full Payment date (${result.fullPaymentDate}) remains active until ${result.expiryDate}.`
            });
          }
        } else {
          result.flags.push({
            severity: "WARNING",
            code: "OCR_DATE_EXTRACTION_FAILED",
            message: "Could not automatically extract a payment date from the full payment receipt."
          });
        }
      }
    }
  } catch (err) {
    console.error("Forensic execution error:", err);
  }

  return result;
}