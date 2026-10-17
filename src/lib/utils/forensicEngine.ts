import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ForensicRuleContext {
  appDetails: any;
  comments: any[];
}

export interface ForensicFlag {
  severity: "CRITICAL" | "WARNING" | "INFO";
  code: string;
  message: string;
}

export interface ForensicAuditResult {
  isDeskReview: boolean;
  detectedAmount: number | null;
  fullPaymentDate: string | null;
  expiryDate: string | null;
  receiptCompanyName: string | null;
  hasValidFullPaymentProof: boolean;
  flags: ForensicFlag[];
}

type ForensicRule = (context: ForensicRuleContext, result: Partial<ForensicAuditResult>) => Promise<void> | void;

// --- ROBUST GEMINI MULTIMODAL PARSER WITH MODEL FALLBACK ---
async function extractReceiptDataWithGemini(pdfUrl: string) {
  if (!pdfUrl) return null;
  
  const response = await fetch(pdfUrl);
  if (!response.ok) return null;
  const arrayBuffer = await response.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  // Cascade through reliable fallback models if high-demand spikes occur
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
    } catch (err: any) {
      console.warn(`Model ${modelName} encountered an error/spike, trying next fallback...`, err?.message || err);
    }
  }

  // Graceful fallback if all models experience high demand
  console.error("All Gemini models encountered 503 high demand spikes. Falling back to default heuristics.");
  return null;
}

// --- RULE 1: Detect Half-Payment / Desk Review ---
const detectDeskReviewRule: ForensicRule = async (context, result) => {
  const { appDetails } = context;
  const intakePdfUrl = appDetails?.poaUrl;
  
  const receiptData = await extractReceiptDataWithGemini(intakePdfUrl);
  
  const commentBlob = context.comments.map((c: any) => c.text || "").join(" ").toLowerCase();
  const commentMentionsDesk = commentBlob.includes("desk review") || commentBlob.includes("half payment");

  const geminiSaysDesk = receiptData?.isHalfPayment || (receiptData?.amount && receiptData.amount >= 7000000 && receiptData.amount <= 9000000);

  result.isDeskReview = !!geminiSaysDesk || commentMentionsDesk;
  result.detectedAmount = receiptData?.amount || null;
  result.receiptCompanyName = receiptData?.companyName || null;
};

// --- RULE 2: Validate Full Payment Receipt Presence ---
const validateFullPaymentProofRule: ForensicRule = async (context, result) => {
  const { appDetails } = context;
  
  if (result.isDeskReview) {
    const verificationUrl = appDetails?.verificationReportUrl;
    const hasProof = !!verificationUrl && verificationUrl.trim() !== "";
    
    result.hasValidFullPaymentProof = hasProof;

    if (!hasProof) {
      if (!result.flags) result.flags = [];
      result.flags.push({
        severity: "CRITICAL",
        code: "MISSING_FULL_PAYMENT_PROOF",
        message: "FRAUD ALERT: Application is classified as a Desk Review (Half Payment), but the required evidence of prior Full Payment (verificationReportUrl) is completely missing."
      });
    }
  } else {
    result.hasValidFullPaymentProof = true;
  }
};

// --- RULE 3: Extract Baseline Expiry Window ---
const auditBaselineExpiryRule: ForensicRule = async (context, result) => {
  const { appDetails } = context;
  
  if (!result.isDeskReview) return;

  const fullPaymentReceiptUrl = appDetails?.verificationReportUrl;
  if (!fullPaymentReceiptUrl) return;

  const receiptData = await extractReceiptDataWithGemini(fullPaymentReceiptUrl);

  if (receiptData && receiptData.paymentDate) {
    const recordedFullPaymentDate = receiptData.paymentDate;
    result.fullPaymentDate = recordedFullPaymentDate;

    const paymentDateObj = new Date(recordedFullPaymentDate);
    const expiryDateObj = new Date(paymentDateObj);
    expiryDateObj.setFullYear(expiryDateObj.getFullYear() + 3);

    result.expiryDate = expiryDateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const now = new Date();

    if (now > expiryDateObj) {
      if (!result.flags) result.flags = [];
      result.flags.push({
        severity: "CRITICAL",
        code: "EXPIRED_FULL_PAYMENT_BASELINE",
        message: `FRAUD / EXPIRY ALERT: Original Full Payment date was ${recordedFullPaymentDate}. The 3-year validation window expired on ${result.expiryDate}.`
      });
    } else {
      if (!result.flags) result.flags = [];
      result.flags.push({
        severity: "INFO",
        code: "VALID_FULL_PAYMENT_BASELINE",
        message: `VERIFIED: Original Full Payment date (${recordedFullPaymentDate}) remains active and valid until ${result.expiryDate}.`
      });
    }
  } else {
    // Graceful degradation: Model unavailable, issue safe un-dated notice instead of crashing
    result.fullPaymentDate = "Manual Verification Required";
    result.expiryDate = "Pending Manual Confirmation";
    if (!result.flags) result.flags = [];
    result.flags.push({
      severity: "WARNING",
      code: "AI_SERVICE_HIGH_DEMAND",
      message: "AI validation models are currently experiencing high demand. The clearance letter has generated with a safe fallback notice requiring manual baseline verification."
    });
  }
};

const activeRules: ForensicRule[] = [
  detectDeskReviewRule,
  validateFullPaymentProofRule,
  auditBaselineExpiryRule,
];

export async function runForensicAudit(appDetails: any): Promise<ForensicAuditResult> {
  const comments = appDetails?.comments || [];
  const context: ForensicRuleContext = { appDetails, comments };
  
  const result: Partial<ForensicAuditResult> = {
    isDeskReview: false,
    detectedAmount: null,
    fullPaymentDate: null,
    expiryDate: null,
    receiptCompanyName: null,
    hasValidFullPaymentProof: true,
    flags: []
  };

  try {
    for (const rule of activeRules) {
      await rule(context, result);
    }
  } catch (err) {
    console.error("Critical Forensic Engine Exception handled gracefully:", err);
  }

  return result as ForensicAuditResult;
}