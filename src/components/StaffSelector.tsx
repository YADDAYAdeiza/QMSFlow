"use client";

import React, { useState, useEffect } from 'react';
import { assignToStaff } from '@/lib/actions/ddd';

interface StaffMember {
  id: string;
  name: string;
}

export default function StaffSelector({ 
  appId, 
  division 
}: { 
  appId: number; 
  division: string 
}) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [isPending, setIsPending] = useState(false);

  // In a real app, you'd fetch this from a server action
  // For now, we assume a helper function gets users by division
  useEffect(() => {
    async function loadStaff() {
      const response = await fetch(`/api/staff?division=${division}`);
      const data = await response.json();
      setStaffList(data);
    }
    loadStaff();
  }, [division]);

  const handleAssign = async () => {
    if (!selectedStaff) return alert("Please select a staff member.");
    
    setIsPending(true);
    try {
      await assignToStaff(appId, selectedStaff, division);
      alert(`Assigned to ${staffList.find(s => s.id === selectedStaff)?.name}`);
    } catch (error) {
      alert("Assignment failed.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border rounded bg-gray-50">
      <select 
        value={selectedStaff} 
        onChange={(e) => setSelectedStaff(e.target.value)}
        className="text-sm border p-1 rounded bg-white"
        disabled={isPending}
      >
        <option value="">Select Reviewer...</option>
        {staffList.map(staff => (
          <option key={staff.id} value={staff.id}>{staff.name}</option>
        ))}
      </select>
      
      <button
        onClick={handleAssign}
        disabled={isPending || !selectedStaff}
        className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold disabled:bg-gray-400"
      >
        {isPending ? "..." : "Assign"}
      </button>
    </div>
  );
}