// components/Vetstat/Permits/PermitPageClient.tsx
'use client';
import { useState } from 'react';
import EnrollmentModal from './EnrollPermitModal';
import PermitDashboard from './PermitDashboard';
import RapidIntake from './RapidIntake';

export default function PermitPageClient({ initialPermits, atcCodes }: any) {
  const [activeTab, setActiveTab] = useState('permits');
  // State to hold the currently selected permit object
  const [selectedPermit, setSelectedPermit] = useState<any | null>(null);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: The Dashboard (takes 2/3 space) */}
        <div className="lg:col-span-2">
          {activeTab === 'permits' ? (
            <PermitDashboard 
              initialPermits={initialPermits} 
              atcCodes={atcCodes} 
              onSelectPermit={setSelectedPermit} // Pass the setter
              selectedId={selectedPermit?.id}    // Pass the current ID for highlighting
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-500">
              <div className="text-8xl mb-6">🚧</div>
              <h2 className="text-xl font-bold">{tabs.find(t => t.id === activeTab)?.label}</h2>
              <p>This module is currently under development.</p>
            </div>
          )}
        </div>

        {/* Right Side: The Rapid Intake (takes 1/3 space) */}
        <div className="lg:col-span-1">
          {selectedPermit ? (
            <div className="sticky top-6 space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs font-bold text-blue-600 uppercase">Active Context</p>
                <h4 className="font-bold text-slate-800">{selectedPermit.company_name}</h4>
                <p className="text-sm text-slate-500">{selectedPermit.permit_number}</p>
              </div>
              <RapidIntake 
                companyName={selectedPermit.company_name} 
                // You can add permitNumber={selectedPermit.permit_number} if you update RapidIntake props
              />
            </div>
          ) : (
            <div className="h-full min-h-[300px] border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 p-10 text-center">
              <p>Select a company row from the left to begin Rapid Intake scanning.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}