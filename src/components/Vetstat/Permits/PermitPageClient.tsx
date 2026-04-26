// components/Vetstat/Permits/PermitPageClient.tsx
'use client';
import { useState } from 'react';
import EnrollmentModal from './EnrollPermitModal';
import PermitDashboard from './PermitDashboard';

const Construction = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-500">
    <div className="text-8xl mb-6">🚧</div>
    <h2 className="text-xl font-bold">{title}</h2>
    <p>This module is currently under development.</p>
  </div>
);

export default function PermitPageClient({ initialPermits, atcCodes }: any) {
  const [activeTab, setActiveTab] = useState('permits');

  const tabs = [
    { id: 'permits', label: 'Import Permits' },
    { id: 'local', label: 'Local Manufacturer Utilization' },
    { id: 'farm', label: 'On-Farm Utilization' },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Regulatory Oversight Console</h1>
        <EnrollmentModal atcCodes={atcCodes} />
      </div>

      <div className="border-b flex gap-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 font-bold ${activeTab === tab.id ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'permits' ? (
        <PermitDashboard initialPermits={initialPermits} atcCodes={atcCodes} />
      ) : (
        <Construction title={tabs.find(t => t.id === activeTab)?.label || ''} />
      )}
    </div>
  );
}