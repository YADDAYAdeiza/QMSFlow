"use client";

import React, { useState, useTransition } from 'react'; 
import { assignToStaff } from '@/lib/actions/ddd';

export default function AssignToStaffButton({ appId, divisions }: { appId: number; divisions: string[] }) { 
    const [isPending, startTransition] = useTransition(); 
    const [isConfirming, setIsConfirming] = useState(false);

const handleAssign = () => { 
    startTransition(async () => { 
        try { await assignToStaff(appId, divisions); 
            setIsConfirming(false); 
        } catch (error) { 
            alert("Assignment failed. Check console."); 
        } 
    }); 
};

if (!isConfirming) { 
    return ( 
    <button onClick={() => setIsConfirming(true)} className="bg-blue-600 text-white px-4 py-2 rounded font-bold" > 
    Assign to Staff 
    </button> ); }

return ( 
<div className="flex flex-col gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded"> 
    <span className="text-xs font-bold text-yellow-800">Start QMS Timer?</span> 
    <div className="flex gap-2">
        <button disabled={isPending} onClick={handleAssign} className="bg-green-600 text-white px-3 py-1 rounded text-xs" > 
            {isPending ? "..." : "Confirm"} 
        </button> 
        <button onClick={() => setIsConfirming(false)} className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-xs" >
            Cancel
        </button> 
        </div> 
        </div> 
        ); 
    }