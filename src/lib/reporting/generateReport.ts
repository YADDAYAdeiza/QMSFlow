// src/lib/reporting/generateReport.ts
import { ZoneMetric, SubstanceMetric } from '@/lib/actions/Vetstat/fetchAnalytics';

/**
 * Generates a Vertical Bar Chart for Geopolitical Zones
 */
export function generateZoneChartUrl(zones: ZoneMetric[]): string {
  const labels = zones.map(z => z.zone);
  const data = zones.map(z => z.value);

  const chartConfig = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Antimicrobial Volume (DDD)',
        data: data,
        backgroundColor: 'rgba(196, 98, 49, 0.7)', // Your branding theme color
        borderColor: 'rgba(196, 98, 49, 1)',
        borderWidth: 1
      }]
    },
    options: {
      title: { display: true, text: 'Antimicrobial Distribution by Geopolitical Zone' }
    }
  };

  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
}

/**
 * NEW: Generates a Doughnut Chart showing the market breakdown by Zone
 */
export function generateZonePieChartUrl(zones: ZoneMetric[]): string {
  const chartConfig = {
    type: 'doughnut',
    data: {
      labels: zones.map(z => z.zone),
      datasets: [{
        data: zones.map(z => z.value),
        backgroundColor: ['#1e293b', '#c46231', '#059669', '#ea580c', '#2563eb', '#7c3aed']
      }]
    },
    options: {
      plugins: {
        legend: { position: 'right' }
      }
    }
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
}

/**
 * NEW: Generates a Horizontal Ranking Bar Chart for Active Substances
 */
export function generateSubstanceChartUrl(substances: SubstanceMetric[]): string {
  // Take top 5 substances to avoid crowding the PDF layout page
  const topFive = substances.slice(0, 5);

  const chartConfig = {
    type: 'horizontalBar',
    data: {
      labels: topFive.map(s => s.substance),
      datasets: [{
        label: 'Total Volume (DDD)',
        data: topFive.map(s => s.volume),
        backgroundColor: 'rgba(37, 99, 235, 0.7)',
        borderColor: 'rgba(37, 99, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      title: { display: true, text: 'Top 5 Prescribed Active Substances' }
    }
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
}