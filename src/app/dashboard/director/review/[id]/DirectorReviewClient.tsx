// // @/app/dashboard/director/review/[id]/DirectorReviewClient.tsx
// "use client"

// import React, { useState, useTransition, useMemo } from 'react';
// import { useRouter } from 'next/navigation';
// import { pdf } from '@react-pdf/renderer';
// import { 
//   ShieldCheck, CheckCircle2, XCircle, 
//   Loader2, MessageSquare, Award, ClipboardList, RotateCcw 
// } from 'lucide-react';
// import { issueFinalClearance } from '@/lib/actions/director';
// import { ClearanceLetter } from "@/components/documents/ClearanceLetter";
// import { supabase } from "@/lib/supabase";
// import RejectionModal from "@/components/RejectionModal";

// export default function DirectorReviewClient({ app, currentTask, usersList, stream, pdfUrl }: any) {
//   const [remarks, setRemarks] = useState("");
//   const [isPending, startTransition] = useTransition();
//   const [processing, setProcessing] = useState(false);
//   const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
//   const router = useRouter();

//   const activeStream = stream || "VMD";
//   const tid = currentTask.id;

//   // SURGICAL TRAIL FILTERING
//   const trail = useMemo(() => {
//     const comments = (app.details as any)?.comments || [];
//     return [...comments]
//       .filter((c: any) => {
//         // Show if it belongs to the current divisional stream (VMD/PAD/etc)
//         // OR if it's a global high-level direction from the Director/LOD
//         const isGlobal = c.from === "Director" || c.division === "LOD";
//         const isStreamContext = c.division === activeStream;
//         return isGlobal || isStreamContext;
//       })
//       .reverse(); // Newest first
//   }, [app.details, activeStream]);

//   const handleApprove = async () => {
//     if (!remarks.trim()) return alert("Executive remarks are required for the final signature.");
//     setProcessing(true);
    
//     try {
//       const templateData = { 
//         appNumber: app.applicationNumber, 
//         companyName: app.company?.name, 
//         date: new Date().toLocaleDateString('en-GB') 
//       };

//       const blob = await pdf(<ClearanceLetter data={templateData} />).toBlob();
//       const path = `${app.applicationNumber}/${activeStream}/CERT_${Date.now()}.pdf`;
      
//       await supabase.storage.from('documents').upload(path, blob);
//       const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);

//       startTransition(async () => {
//         const res = await issueFinalClearance(app.id, remarks, publicUrl, activeStream, tid);
//         if (res.success) { 
//           router.push('/dashboard/director?view=final'); 
//           router.refresh(); 
//         } else {
//           alert(res.error);
//         }
//       });
//     } catch (err: any) { 
//       alert(err.message); 
//     } finally { 
//       setProcessing(false); 
//     }
//   };

//   return (
//     <div className="fixed inset-0 flex bg-slate-100 overflow-hidden font-sans">
//       {/* LEFT HALF: THE DOSSIER / REPORT */}
//       <div className="w-1/2 p-6 h-full">
//         <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full h-full overflow-hidden relative">
//           <div className="absolute top-6 left-6 z-10 bg-slate-900/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">
//             Technical Evidence
//           </div>
//           <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full" title="Dossier Report" />
//         </div>
//       </div>

//       {/* RIGHT HALF: EXECUTIVE ACTIONS & TRAIL */}
//       <div className="w-1/2 p-10 overflow-y-auto custom-scrollbar">
//         <div className="max-w-xl mx-auto space-y-8 pb-20">
          
//           {/* HEADER */}
//           <div className="flex justify-between items-end">
//             <div>
//               <div className="flex items-center gap-2 mb-1">
//                 <div className="h-1.5 w-8 bg-blue-600 rounded-full" />
//                 <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Directorate Final Review</span>
//               </div>
//               <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
//                 #{app.applicationNumber}
//               </h1>
//             </div>
//             <button 
//               onClick={() => setIsReturnModalOpen(true)} 
//               className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase shadow-sm hover:bg-slate-50 transition-all active:scale-95"
//             >
//               <RotateCcw className="w-3 h-3 text-rose-500" /> Return for Rework
//             </button>
//           </div>

//           {/* HUB RECOMMENDATION CARD */}
//           <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
//               <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
//                 <ClipboardList className="w-32 h-32" />
//               </div>
//               <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-3 flex items-center gap-2">
//                 <ShieldCheck className="w-4 h-4" /> Endorsement from {activeStream}
//               </h3>
//               <p className="text-xl font-bold italic leading-relaxed relative z-10">
//                 "{currentTask.details?.note || "The technical review is complete and meets all standards."}"
//               </p>
//           </div>

//           {/* SIGNATURE BOX */}
//           <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl border border-slate-800">
//             <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
//               <Award className="w-5 h-5" /> Final Signature Authorization: {activeStream}
//             </h3>
//             <textarea 
//               value={remarks} 
//               onChange={(e) => setRemarks(e.target.value)} 
//               className="w-full h-40 bg-slate-800/50 border border-slate-700 rounded-[2rem] p-6 text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-6 transition-all" 
//               placeholder="Type your final comments here..." 
//             />
//             <div className="grid grid-cols-2 gap-4">
//               <button 
//                 onClick={handleApprove} 
//                 disabled={processing || isPending} 
//                 className="py-5 bg-emerald-500 hover:bg-emerald-600 rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 disabled:opacity-50"
//               >
//                 {(processing || isPending) ? <Loader2 className="animate-spin w-5 h-5" /> : <><CheckCircle2 className="w-5 h-5" /> Sign & Approve</>}
//               </button>
//               <button className="py-5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg">
//                 <XCircle className="w-5 h-5" /> Reject (CAPA)
//               </button>
//             </div>
//           </div>

//           {/* SURGICAL ACTIVITY TRAIL */}
//           <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-200">
//             <div className="flex items-center justify-between mb-8">
//                 <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-400">
//                     <MessageSquare className="w-4 h-4" /> Divisional Activity Trail
//                 </h3>
//                 <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase">
//                     {activeStream} Stream
//                 </span>
//             </div>

//             <div className="space-y-8 relative">
//                 <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-100" />

//                 {trail.map((note: any, idx: number) => (
//                     <div key={idx} className="relative pl-10">
//                         <div className="absolute left-1.5 top-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full z-10" />
//                         <div className="flex items-center gap-2 mb-1">
//                             <span className={`font-black text-[10px] uppercase tracking-tight ${note.from === 'Director' ? 'text-emerald-600' : 'text-blue-600'}`}>
//                                 {note.from === 'Director' ? '✦ Executive Director' : `[${note.division}] ${note.from}`}
//                             </span>
//                             <span className="text-[8px] font-medium text-slate-400 font-mono">
//                                 {note.timestamp ? new Date(note.timestamp).toLocaleString() : ''}
//                             </span>
//                         </div>
//                         <div className={`p-5 rounded-2xl text-[12px] italic border ${note.from === 'Director' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
//                             "{note.text}"
//                         </div>
//                     </div>
//                 ))}
//                 {trail.length === 0 && (
//                     <div className="py-10 text-center text-[10px] text-slate-300 uppercase font-black tracking-widest">
//                         No divisional history found
//                     </div>
//                 )}
//             </div>
//           </div>
//         </div>
//       </div>

//       <RejectionModal 
//         isOpen={isReturnModalOpen} 
//         onClose={() => setIsReturnModalOpen(false)} 
//         appId={app.id} 
//         timelineId={tid} 
//         currentStream={activeStream} 
//         staffList={usersList} 
//         onSuccess={() => { router.push('/dashboard/director?view=final'); router.refresh(); }} 
//       />
//     </div>
//   );
// }


// @/app/dashboard/director/review/[id]/DirectorReviewClient.tsx
// @/app/dashboard/director/review/[id]/DirectorReviewClient.tsx
// @/app/dashboard/director/review/[id]/DirectorReviewClient.tsx
"use client"

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { pdf } from '@react-pdf/renderer';
import { 
  ShieldCheck, Loader2, MessageSquare, Award, RotateCcw, FileWarning, XCircle
} from 'lucide-react';
import { issueFinalClearance } from '@/lib/actions/director';
import { ClearanceLetter } from "@/components/documents/ClearanceLetter";
import { supabase } from "@/lib/supabase";
import RejectionModal from "@/components/RejectionModal";

export default function DirectorReviewClient({ app, usersList, stream, pdfUrl, currentUserId }: any) {
  const [remarks, setRemarks] = useState("");
  const [isPending, startTransition] = useTransition();
  const [processing, setProcessing] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const router = useRouter();

  const activeStream = stream || "VMD";

  // Filter the trail to show the stream-specific context + global minutes
  const trail = useMemo(() => {
    const comments = app.commentsTrail || [];
    return [...comments]
      .filter((c: any) => {
        const isGlobal = c.role === "Director" || c.division === "LOD";
        const isStream = c.division === activeStream || c.division === "IRSD"; 
        return isGlobal || isStream;
      })
      .reverse();
  }, [app.commentsTrail, activeStream]);

  const handleApprove = async () => {
    if (!remarks.trim()) return alert("Executive remarks required.");
    setProcessing(true);
    try {
      const templateData = { appNumber: app.applicationNumber, companyName: app.company?.name, date: new Date().toLocaleDateString('en-GB') };
      const blob = await pdf(<ClearanceLetter data={templateData} />).toBlob();
      const path = `${app.applicationNumber}/${activeStream}/CERT_${Date.now()}.pdf`;
      
      await supabase.storage.from('documents').upload(path, blob);
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);

      startTransition(async () => {
        const res = await issueFinalClearance(app.id, remarks, publicUrl, activeStream);
        if (res.success) { router.push('/dashboard/director?view=final'); router.refresh(); }
        else { alert(res.error); setProcessing(false); }
      });
    } catch (err: any) { alert(err.message); setProcessing(false); }
  };

  return (
    <div className="fixed inset-0 flex bg-slate-100 overflow-hidden font-sans">
      {/* PDF VIEWER SECTION */}
      <div className="w-1/2 p-6 h-full">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full h-full overflow-hidden relative">
          <div className="absolute top-6 left-6 z-10 bg-slate-900/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">
            {activeStream} Technical Evidence
          </div>
          {pdfUrl && pdfUrl.startsWith('http') ? (
            <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-none" title="Report" />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50">
              <FileWarning className="w-12 h-12 text-slate-200 mb-2" />
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Dossier URL Missing</p>
            </div>
          )}
        </div>
      </div>

      {/* ACTION SECTION */}
      <div className="w-1/2 p-10 overflow-y-auto custom-scrollbar">
        <div className="max-w-xl mx-auto space-y-8 pb-20">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-1.5 w-8 bg-blue-600 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Executive Directorate</span>
              </div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none italic">#{app.applicationNumber}</h1>
            </div>
            <button onClick={() => setIsReturnModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase shadow-sm hover:bg-slate-50 transition-all">
              <RotateCcw className="w-3 h-3 text-rose-500" /> Return for Rework
            </button>
          </div>

          <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Divisional Endorsement
              </h3>
              <p className="text-xl font-bold italic">"{app.dddInstruction}"</p>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl border border-slate-800">
            <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
              <Award className="w-5 h-5" /> Signature: {activeStream} Stream
            </h3>
            <textarea 
              value={remarks} 
              onChange={(e) => setRemarks(e.target.value)} 
              className="w-full h-40 bg-slate-800/50 border border-slate-700 rounded-[2rem] p-6 text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-6" 
              placeholder="Provide final sign-off remarks..." 
            />
            <button onClick={handleApprove} disabled={processing || isPending} className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 transition-all">
              {(processing || isPending) ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign & Finalize Certificate"}
            </button>
          </div>

          {/* ACTIVITY TRAIL */}
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-200">
            <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-400 mb-8">
                <MessageSquare className="w-4 h-4" /> Audit Trail
            </h3>
            <div className="space-y-8 relative">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-100" />
                {trail.map((note: any, idx: number) => (
                    <div key={idx} className="relative pl-10">
                        <div className="absolute left-1.5 top-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full z-10" />
                        <span className={`font-black text-[10px] uppercase ${note.role === 'Director' ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {note.role === 'Director' ? '✦ Director' : `[${note.division || 'TECH'}] ${note.from}`}
                        </span>
                        <div className={`p-4 mt-1 rounded-2xl text-[12px] italic border ${note.role === 'Director' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                            "{note.text}"
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <RejectionModal 
        isOpen={isReturnModalOpen} 
        onClose={() => setIsReturnModalOpen(false)} 
        appId={app.id} 
        currentDDId={currentUserId} 
        currentStaffId={app.details?.staff_reviewer_id} 
        staffList={usersList} 
        onSuccess={() => { router.push('/dashboard/director?view=final'); router.refresh(); }} 
      />
    </div>
  );
}