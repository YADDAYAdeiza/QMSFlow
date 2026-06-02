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

    // 1. Fetch raw data
    const analyticsData = await getAMSRegionalAnalytics(startDate, endDate, species, risk);

    // 2. Compute Graphics Configurations
    const zoneLabels = analyticsData.zones.map(z => z.zone);
    const zoneValues = analyticsData.zones.map(z => z.value);
    const topSubstances = analyticsData.topSubstances.slice(0, 5);

    const barChartConfig = {
      type: 'bar',
      data: {
        labels: zoneLabels,
        datasets: [{
          label: 'Antimicrobial Volume (DDD)',
          data: zoneValues,
          backgroundColor: 'rgba(196, 98, 49, 0.75)',
        }]
      },
      options: { legend: { display: false }, title: { display: true, text: 'Consumption by Zone (DDD)' } }
    };

    const doughnutChartConfig = {
      type: 'doughnut',
      data: {
        labels: zoneLabels,
        datasets: [{
          data: zoneValues,
          backgroundColor: ['#1e293b', '#c46231', '#059669', '#ea580c', '#2563eb', '#7c3aed']
        }]
      },
      options: { title: { display: true, text: 'Percentage Breakdown' } }
    };

    const horizontalChartConfig = {
      type: 'horizontalBar',
      data: {
        labels: topSubstances.map(s => s.substance),
        datasets: [{
          label: 'Volume (DDD)',
          data: topSubstances.map(s => s.volume),
          backgroundColor: 'rgba(37, 99, 235, 0.75)',
        }]
      },
      options: { legend: { display: false }, title: { display: true, text: 'Top 5 Active Substances' } }
    };

    const zoneBarUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(barChartConfig))}`;
    const zonePieUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(doughnutChartConfig))}`;
    const substanceBarUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(horizontalChartConfig))}`;

    // 3. Render PDF Stream
    const reportElement = React.createElement(SurveillancePdfReport, {
      zones: analyticsData.zones,
      topSubstances: analyticsData.topSubstances,
      totalDDD: analyticsData.totalDDD,
      globalTrend: analyticsData.globalTrend,
      charts: { zoneBarUrl, zonePieUrl, substanceBarUrl }
    });

    const pdfStream = await renderToStream(reportElement as any);

    // 4. Return Buffered Response with strict security headers
    const chunks: Buffer[] = [];
    return new Promise<NextResponse>((resolve, reject) => {
      pdfStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfStream.on('end', () => {
        const result = Buffer.concat(chunks);
        resolve(new NextResponse(result, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="VMD_Surveillance_Report_${new Date().toISOString().split('T')[0]}.pdf"`,
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }));
      });
      pdfStream.on('error', (err) => reject(err));
    });

  } catch (error: any) {
    console.error("Critical Failure processing automated server-side report:", error);
    return NextResponse.json({ error: "Generation Pipeline Interrupted" }, { status: 500 });
  }
}