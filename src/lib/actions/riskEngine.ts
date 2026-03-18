// Complexity/Criticality to Intrinsic Level Mapping (Part B of your doc)
// Score 1-2 = Low, 3-4 = Medium, 6-9 = High
export const calculateIntrinsicLevel = (complexity: number, criticality: number): 'Low' | 'Medium' | 'High' => {
  const score = complexity * criticality;
  if (score <= 2) return 'Low';
  if (score <= 4) return 'Medium';
  return 'High';
};

// Final ORR Matrix (Part E of your doc)
export const calculateORR = (intrinsic: 'Low' | 'Medium' | 'High', compliance: 'Low' | 'Medium' | 'High'): { rating: 'A' | 'B' | 'C'; interval: number } => {
  const matrix: Record<string, Record<string, 'A' | 'B' | 'C'>> = {
    Low:    { Low: 'A', Medium: 'A', High: 'B' },
    Medium: { Low: 'A', Medium: 'B', High: 'C' },
    High:   { Low: 'B', Medium: 'C', High: 'C' }
  };

  const rating = matrix[intrinsic][compliance];
  
  const intervals = {
    A: 24, // 2 years
    B: 12, // 1 year
    C: 6   // 6 months
  };

  return { rating, interval: intervals[rating] };
};