"use client";

import { useState, useEffect } from "react";
import { UserCircle, Clock } from "lucide-react";
import DeleteStaffButton from "./DeleteStaffButton";

export default function StaffTableBody({ 
  allStaff, 
  currentUserId, 
  deleteStaff 
}: { 
  allStaff: any[], 
  currentUserId: string, 
  deleteStaff: (formData: FormData) => Promise<void> 
}) {
  const [hasMounted, setHasMounted] = useState(false);

  // Force sync to client to prevent hydration mismatch from extensions or local time
  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null; // The server renders nothing in the tbody, then client fills it in
  }

  return (
    <tbody>
      {allStaff.map((person) => {
        const isConnected = !!person.linkedAt;
        return (
          <tr key={person.id} className="border-b border-slate-100 last:border-none group hover:bg-blue-50/30 transition-colors">
            <td className="p-6">
              <div className="flex items-center gap-3">
                <UserCircle className="w-8 h-8 text-slate-300" />
                <div>
                  <p className="font-bold text-slate-800 text-sm uppercase italic">{person.name}</p>
                  <p className="text-[10px] text-slate-400 lowercase">{person.email}</p>
                </div>
              </div>
            </td>
            <td className="p-6 text-center">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[9px] font-black uppercase">
                {person.division}
              </span>
            </td>
            <td className="p-6 text-center">
              {isConnected ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[8px] font-black uppercase border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[8px] font-black uppercase border border-amber-100">
                  <Clock className="w-3 h-3" />
                  Pending
                </div>
              )}
            </td>
            <td className="p-6 text-right pr-10">
              {person.id !== currentUserId && (
                <DeleteStaffButton 
                  userId={person.id} 
                  userName={person.name} 
                  deleteAction={deleteStaff} 
                />
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}