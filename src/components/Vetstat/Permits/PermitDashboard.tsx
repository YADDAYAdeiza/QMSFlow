'use client';
import { useState, Fragment } from 'react';
import EditPermitModal from './EditPermitModal';

export default function PermitDashboard({ 
  initialPermits, 
  atcCodes 
}: { 
  initialPermits: any[], 
  atcCodes: any[] 
}) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingPermit, setEditingPermit] = useState<any | null>(null);

  // Filter logic for searching
  const filtered = initialPermits.filter(p => 
    p.permit_number.toLowerCase().includes(search.toLowerCase()) || 
    p.company_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      {/* Search Input */}
      <input 
        placeholder="Search by Permit # or Company..." 
        className="border p-2 w-full rounded"
        onChange={(e) => setSearch(e.target.value)}
      />

      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Permit #</th>
            <th className="border p-2 text-left">Company</th>
            <th className="border p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((permit) => (
            <Fragment key={permit.id}>
              <tr className="hover:bg-gray-50 border-b">
                <td 
                  className="border p-2 cursor-pointer text-blue-600 font-medium" 
                  onClick={() => setExpandedId(expandedId === permit.id ? null : permit.id)}
                >
                  {permit.permit_number} {expandedId === permit.id ? '▲' : '▼'}
                </td>
                <td className="border p-2">{permit.company_name}</td>
                <td className="border p-2">
                  <button 
                    onClick={() => setEditingPermit(permit)} 
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Edit
                  </button>
                </td>
              </tr>
              
              {/* Expanded Detail View */}
              {expandedId === permit.id && (
                <tr className="bg-gray-50">
                  <td colSpan={3} className="p-4 border">
                    <h4 className="font-bold text-sm mb-2">Substances Authorized:</h4>
                    {permit.permit_substances && permit.permit_substances.length > 0 ? (
                      <ul className="text-sm list-disc pl-5">
                        {permit.permit_substances.map((s: any) => {
                          const foundSubstance = atcCodes.find(a => a.id === s.substance_id);
                          return (
                            <li key={s.id}>
                              {foundSubstance ? foundSubstance.substance : `ID Mismatch: ${s.substance_id}`} 
                              - {s.quantity_kg}kg
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No substances listed.</p>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      {editingPermit && (
        <EditPermitModal 
          permit={editingPermit} 
          atcCodes={atcCodes} 
          onClose={() => setEditingPermit(null)} 
        />
      )}
    </div>
  );
}