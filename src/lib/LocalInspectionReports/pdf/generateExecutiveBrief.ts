// @/lib/pdf/generateExecutiveBrief.ts

export interface ExecutiveBriefData {
  reportRefNumber: string;
  generatedDate: string;
  timeframe: string;
  complianceRate: number;
  avgCapaDays: number;
  totalInspections: number;
  criticalCount: number;
  topDeficitDomains: Array<{ domain: string; count: number; criticals: number }>;
  rootCauses: Array<{ category: string; percentage: number }>;
  regionalRisk: Array<{ region: string; count: number; criticals: number; riskLevel: string }>;
}

export function buildExecutiveBriefHtml(data: ExecutiveBriefData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Executive Policy Brief - ${data.reportRefNumber}</title>
        <style>
          @page { size: A4; margin: 18mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; line-height: 1.5; font-size: 11pt; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 16pt; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 4px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 9pt; background: #f8fafc; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
          .section-title { font-size: 12pt; font-weight: bold; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; }
          .kpi-container { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 10px; }
          .kpi-card { flex: 1; background: #f1f5f9; padding: 12px; border-radius: 6px; border-left: 4px solid #0284c7; }
          .kpi-value { font-size: 18pt; font-weight: bold; color: #0f172a; }
          .kpi-label { font-size: 8pt; text-transform: uppercase; color: #64748b; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5pt; }
          th { background: #0f172a; color: #ffffff; text-align: left; padding: 6px 8px; font-size: 8.5pt; text-transform: uppercase; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
          .risk-high { color: #dc2626; font-weight: bold; }
          .risk-moderate { color: #d97706; font-weight: bold; }
          .risk-low { color: #16a34a; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">National Veterinary Regulatory Intelligence Brief</div>
          <div style="font-size: 10pt; color: #475569;">Veterinary Medicines Directorate (VMD) | Quality Management System</div>
        </div>

        <div class="meta-grid">
          <div><strong>REF NUMBER:</strong> ${data.reportRefNumber}</div>
          <div><strong>DATE:</strong> ${data.generatedDate}</div>
          <div><strong>TIMEFRAME:</strong> ${data.timeframe}</div>
          <div><strong>TARGET AUDIENCE:</strong> Executive Leadership / Director General</div>
        </div>

        <div class="kpi-container">
          <div class="kpi-card">
            <div class="kpi-label">National Compliance Rate</div>
            <div class="kpi-value">${data.complianceRate}%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Avg CAPA Resolution</div>
            <div class="kpi-value">${data.avgCapaDays} Days</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Inspections YTD</div>
            <div class="kpi-value">${data.totalInspections}</div>
          </div>
          <div class="kpi-card" style="border-left-color: #dc2626;">
            <div class="kpi-label">Critical Deficiencies</div>
            <div class="kpi-value" style="color: #dc2626;">${data.criticalCount}</div>
          </div>
        </div>

        <div class="section-title">1. Top Vulnerable Quality Systems</div>
        <table>
          <thead>
            <tr>
              <th>Quality Domain</th>
              <th>Total Deficiencies</th>
              <th>Critical Severity</th>
            </tr>
          </thead>
          <tbody>
            ${data.topDeficitDomains.map(d => `
              <tr>
                <td><strong>${d.domain}</strong></td>
                <td>${d.count}</td>
                <td><span class="${d.criticals > 0 ? 'risk-high' : ''}">${d.criticals}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">2. Primary Industry Root Causes</div>
        <ul>
          ${data.rootCauses.map(rc => `
            <li><strong>${rc.category}:</strong> Accounts for <strong>${rc.percentage}%</strong> of non-conformities across audited facilities.</li>
          `).join('')}
        </ul>

        <div class="section-title">3. Regional Risk Matrix</div>
        <table>
          <thead>
            <tr>
              <th>Geographic Zone</th>
              <th>Inspections Executed</th>
              <th>Critical Findings</th>
              <th>Assessed Risk Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.regionalRisk.map(r => `
              <tr>
                <td>${r.region}</td>
                <td>${r.count}</td>
                <td>${r.criticals}</td>
                <td class="risk-${r.riskLevel.toLowerCase()}">${r.riskLevel}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">4. Strategic Directorial Recommendations</div>
        <ol>
          <li>Target inspectorate resources toward high-risk industrial clusters identified in the regional risk matrix.</li>
          <li>Issue regulatory guidance notes addressing the primary root causes (${data.rootCauses[0]?.category || 'SOP Deficit'}).</li>
          <li>Enforce the statutory 30-day window for facilities with pending CAPA resolution.</li>
        </ol>
      </body>
    </html>
  `;
}