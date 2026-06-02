'use client'

import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend
);

export function BarChart({ labels, values }: { labels: string[], values: number[] }) {
  const chartData = {
    labels: labels,
    datasets: [{
      label: 'Volume (DDD)',
      data: values,
      backgroundColor: '#2563eb', // Clean solid blue fallback (or array if mapping unique indices)
      borderRadius: 6,
    }],
  };
  
  const options: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: { display: false } // Hiding redundant legend for single dataset bars
    },
    scales: {
      y: { beginAtZero: true }
    }
  };
  
  return <Bar data={chartData} options={options} />;
}

export function LineChart({ 
  labels, 
  values, 
  datasets 
}: { 
  labels: string[], 
  values?: number[], 
  datasets?: any[] 
}) {
  const chartData = {
    labels: labels,
    datasets: datasets || [{
      label: 'Consumption Trend (DDD)',
      data: values,
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.05)',
      fill: true,
    }],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    elements: {
      line: {
        tension: 0.3, // Globally configures curve aesthetics across all chart lines safely
      },
    },
    scales: {
      y: { beginAtZero: true }
    }
  };
  
  return <Line data={chartData} options={options} />;
}

export function PieChart({ labels, values }: { labels: string[], values: number[] }) {
  const chartData = {
    labels: labels,
    datasets: [{
      label: 'Consumption by Class',
      data: values,
      backgroundColor: [
        '#2563eb', // Blue
        '#ef4444', // Red
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#8b5cf6', // Violet
      ],
      borderWidth: 1,
    }],
  };
  
  const options: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { boxWidth: 12, font: { weight: 'bold' } }
      }
    }
  };
  
  return <Pie data={chartData} options={options} />;
}