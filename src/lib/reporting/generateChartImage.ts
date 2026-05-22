// src/lib/reporting/generateChartImage.ts
import { createCanvas } from 'canvas'; // Standard server utility
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export async function generateZoneChartImage(zones: any[]): Promise<string> {
  // Create an isolated canvas size matching standard PDF layouts
  const width = 600;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Assembles standard chart properties
  new Chart(ctx as any, {
    type: 'bar',
    data: {
      labels: zones.map(z => z.zone),
      datasets: [{
        label: 'Total Structural Load (DDD)',
        data: zones.map(z => z.value),
        backgroundColor: '#c46231', // Using safe HSL/Hex color values
      }]
    },
    options: {
      responsive: false,
      animation: false
    }
  });

  // Returns a clean, high-resolution base64 string image data format
  return canvas.toDataURL('image/png');
}