"use client";

import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, ResponsiveContainer, Tooltip 
} from 'recharts';

export default function AnalyticsClient({ data }: { data: any[] }) {
  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} 
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '20px', 
              border: 'none', 
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
              fontSize: '10px',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }} 
          />
          <Radar
            name="Total Deficiencies"
            dataKey="total"
            stroke="#2563eb"
            strokeWidth={3}
            fill="#3b82f6"
            fillOpacity={0.1}
          />
          <Radar
            name="Criticals"
            dataKey="critical"
            stroke="#e11d48"
            strokeWidth={2}
            fill="#f43f5e"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}