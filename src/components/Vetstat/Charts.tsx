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
} from 'chart.js';

// Register all necessary components for Bar, Line, and Pie charts
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
      backgroundColor: ['#2563eb', '#ef4444'], // Blue for Imports, Red for Consumption
      borderRadius: 8,
    }],
  };
  
  return <Bar data={chartData} options={{ responsive: true }} />;
}

export function LineChart({ labels, values }: { labels: string[], values: number[] }) {
  const chartData = {
    labels: labels,
    datasets: [{
      label: 'Consumption Trend (DDD)',
      data: values,
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
      tension: 0.3,
      fill: true,
    }],
  };
  
  return <Line data={chartData} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />;
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
  
  return <Pie data={chartData} options={{ responsive: true }} />;
}