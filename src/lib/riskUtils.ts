// src/lib/riskUtils.ts
export const calculateIntrinsicLevel = (score: number) => {
  if (score <= 2) return { label: 'LOW', color: 'text-emerald-500 bg-emerald-50' };
  if (score <= 4) return { label: 'MEDIUM', color: 'text-amber-500 bg-amber-50' };
  return { label: 'HIGH', color: 'text-rose-500 bg-rose-50' };
};

// This matches the product_line_risks table we seeded
export const PRODUCT_RISK_MAP: Record<string, { complexity: number, criticality: number }> = {
  "VACCINES / BIOLOGICALS": { complexity: 3, criticality: 3 },
  "STERILE INJECTABLES": { complexity: 3, criticality: 2 },
  "POWDER BETA-LACTAMS": { complexity: 2, criticality: 3 },
  "TABLETS (GENERAL)": { complexity: 1, criticality: 2 },
  "MULTIVITAMINS": { complexity: 1, criticality: 1 },
};