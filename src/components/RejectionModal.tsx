// "use client"

// import React, { useState } from 'react';
// import { returnToStaff } from '@/lib/actions'; // Adjust path to your actions
// import { AlertCircle, RotateCcw, UserPlus } from 'lucide-react';

// interface RejectionModalProps {
//   appId: number;
//   currentStaffId: string; // <--- The Modal expects this
//   onSuccess: () => void;  // <--- The Modal expects this
// }


// export default function RejectionModal({ appId, currentStaffId, onSuccess }: RejectionModalProps) {
//   const [reason, setReason] = useState("");
//   const [isReassigning, setIsReassigning] = useState(false);
//   const [newStaffId, setNewStaffId] = useState("");
//   const [loading, setLoading] = useState(false);

//   async function handleReturn() {
//     if (!reason) return alert("Please provide a reason for rejection");
    
//     setLoading(true);
//     // If isReassigning is false, we pass undefined so the action keeps the original staff
//     const result = await returnToStaff(appId, reason, isReassigning ? newStaffId : undefined);
    
//     if (result.success) {
//       onSuccess();
//     } else {
//       alert("Failed to return application.");
//     }
//     setLoading(false);
//   }

//   return (
//     <div className="p-6 bg-white border border-red-100 rounded-2xl shadow-xl space-y-4">
//       <div className="flex items-center gap-3 text-red-600">
//         <RotateCcw className="w-6 h-6" />
//         <h2 className="text-lg font-bold">Return for Rework</h2>
//       </div>

//       <div className="space-y-2">
//         <label className="text-xs font-black uppercase text-slate-500 tracking-widest">
//           Reason for Rejection (Visible to Staff)
//         </label>
//         <textarea 
//           className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 min-h-[100px]"
//           placeholder="Explain what needs to be fixed..."
//           value={reason}
//           onChange={(e) => setReason(e.target.value)}
//         />
//       </div>

//       {/* Reassignment Toggle */}
//       <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
//         <label className="flex items-center gap-3 cursor-pointer">
//           <input 
//             type="checkbox" 
//             checked={isReassigning}
//             onChange={(e) => setIsReassigning(e.target.checked)}
//             className="w-4 h-4 accent-red-600"
//           />
//           <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
//             <UserPlus className="w-4 h-4" /> Reassign to different staff?
//           </span>
//         </label>

//         {isReassigning && (
//           <div className="mt-3">
//             <input 
//               type="text"
//               placeholder="Enter New Staff ID..."
//               className="w-full p-2 border border-slate-200 rounded text-sm"
//               value={newStaffId}
//               onChange={(e) => setNewStaffId(e.target.value)}
//             />
//             <p className="text-[10px] text-slate-400 mt-1 italic">
//               *If left blank, it will return to the original reviewer.
//             </p>
//           </div>
//         )}
//       </div>

//       <div className="flex gap-3 pt-2">
//         <button 
//           disabled={loading}
//           onClick={handleReturn}
//           className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
//         >
//           {loading ? "Processing..." : "Confirm Rejection"}
//         </button>
//       </div>
//     </div>
//   );
// }


"use client"

import React, { useState } from 'react';
import { returnToStaff } from '@/lib/actions'; 
import { AlertCircle, RotateCcw, UserPlus, X } from 'lucide-react';

interface RejectionModalProps {
  isOpen: boolean;      // Added
  onClose: () => void;   // Added
  appId: number;
  currentStaffId: string;
  onSuccess: () => void;
}

export default function RejectionModal({ 
  isOpen, 
  onClose, 
  appId, 
  currentStaffId, 
  onSuccess 
}: RejectionModalProps) {
  const [reason, setReason] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [newStaffId, setNewStaffId] = useState("");
  const [loading, setLoading] = useState(false);

  // If the modal isn't supposed to be open, return nothing
  if (!isOpen) return null;

  async function handleReturn() {
    if (!reason) return alert("Please provide a reason for rejection");
    
    setLoading(true);
    const result = await returnToStaff(appId, reason, isReassigning ? newStaffId : undefined);
    
    if (result.success) {
      onSuccess();
    } else {
      alert("Failed to return application.");
    }
    setLoading(false);
  }

  return (
    // Fixed: Added a full-screen overlay so it behaves like a real modal
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white border border-red-100 rounded-2xl shadow-2xl space-y-4 overflow-hidden">
        
        <div className="p-6">
          <div className="flex items-center justify-between text-red-600 mb-4">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-6 h-6" />
              <h2 className="text-lg font-bold">Return for Rework</h2>
            </div>
            {/* Added a close button for better UX */}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest">
                Reason for Rejection (Visible to Staff)
              </label>
              <textarea 
                className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 min-h-[100px] outline-none"
                placeholder="Explain what needs to be fixed..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {/* Reassignment Toggle */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isReassigning}
                  onChange={(e) => setIsReassigning(e.target.checked)}
                  className="w-4 h-4 accent-red-600"
                />
                <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Reassign to different staff?
                </span>
              </label>

              {isReassigning && (
                <div className="mt-3">
                  <input 
                    type="text"
                    placeholder="Enter New Staff ID..."
                    className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    value={newStaffId}
                    onChange={(e) => setNewStaffId(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    *If left blank, it will return to the original reviewer.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                disabled={loading}
                onClick={handleReturn}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? "Processing..." : "Confirm Return"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}