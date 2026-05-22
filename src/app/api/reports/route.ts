// src/app/api/reports/route.ts
import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import React from 'react';
import { getAMSRegionalAnalytics } from '@/lib/actions/Vetstat/fetchAnalytics';
import { SurveillancePdfReport } from '@/components/reports/SurveillancePdfReport';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const species = searchParams.get('species') || 'All';
    const risk = searchParams.get('risk') || 'All';

    // 1. Fetch raw data stream directly from Supabase via our action layout
    const analyticsData = await getAMSRegionalAnalytics(startDate, endDate, species, risk);

    // 2. Compute Multiple QuickChart Graphics Path Definitions
    const zoneLabels = analyticsData.zones.map(z => z.zone);
    const zoneValues = analyticsData.zones.map(z => z.value);
    const topSubstances = analyticsData.topSubstances.slice(0, 5); // top 5 for ranking chart

    // Chart A: Vertical Bar Chart (Zones)
    const barChartConfig = {
      type: 'bar',
      data: {
        labels: zoneLabels,
        datasets: [{
          label: 'Antimicrobial Volume (DDD)',
          data: zoneValues,
          backgroundColor: 'rgba(196, 98, 49, 0.75)',
          borderColor: 'rgba(196, 98, 49, 1)',
          borderWidth: 1
        }]
      },
      options: {
        legend: { display: false },
        title: { display: true, text: 'Absolute Consumption (DDD) by Geopolitical Zone', fontSize: 14 }
      }
    };

    // Chart B: Proportional Doughnut Chart (Zone Market Breakdown)
    const doughnutChartConfig = {
      type: 'doughnut',
      data: {
        labels: zoneLabels,
        datasets: [{
          data: zoneValues,
          backgroundColor: ['#1e293b', '#c46231', '#059669', '#ea580c', '#2563eb', '#7c3aed']
        }]
      },
      options: {
        title: { display: true, text: 'Geopolitical Percentage Breakdown', fontSize: 14 },
        plugins: { legend: { position: 'right' } }
      }
    };

    // Chart C: Horizontal Bar Chart (Top Substances)
    const horizontalChartConfig = {
      type: 'horizontalBar',
      data: {
        labels: topSubstances.map(s => s.substance),
        datasets: [{
          label: 'Volume (DDD)',
          data: topSubstances.map(s => s.volume),
          backgroundColor: 'rgba(37, 99, 235, 0.75)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        legend: { display: false },
        title: { display: true, text: 'Top 5 Active Substances Distribution Ranking', fontSize: 14 },
        scales: { xAxes: [{ ticks: { beginAtZero: true } }] }
      }
    };

    const zoneBarUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(barChartConfig))}`;
    const zonePieUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(doughnutChartConfig))}`;
    const substanceBarUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(horizontalChartConfig))}`;

    // 3. Render the layout directly into a printable Node streaming path
  // src/app/api/reports/route.ts

// 3. Render the layout directly into a printable Node streaming path
// src/app/api/reports/route.ts

// 3. Render the layout directly into a printable Node streaming path
// Dynamically instantiate the template component function as an explicit React Element factory
const reportElement = React.createElement(SurveillancePdfReport, {
  zones: analyticsData.zones,
  topSubstances: analyticsData.topSubstances,
  totalDDD: analyticsData.totalDDD,
  globalTrend: analyticsData.globalTrend,
  charts: {
    zoneBarUrl,
    zonePieUrl,
    substanceBarUrl
  }
});

// Explicitly cast to 'any' inside the render function argument 
// to satisfy @react-pdf's internal DocumentProps definition
const pdfStream = await renderToStream(reportElement as any);

    // 4. Pipe binary responses straight back down to browser windows
    const chunks: any[] = [];
    return new Promise<NextResponse>((resolve, reject) => {
      pdfStream.on('data', (chunk) => chunks.push(chunk));
      pdfStream.on('end', () => {
        const result = Buffer.concat(chunks);
        const response = new NextResponse(result, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="VMD_Surveillance_Report_2026.pdf"',
          },
        });
        resolve(response);
      });
      pdfStream.on('error', (err) => reject(err));
    });

  } catch (error: any) {
    console.error("Critical Failure processing automated server-side report:", error);
    return NextResponse.json({ error: "Generation Pipeline Interrupted" }, { status: 500 });
  }
}