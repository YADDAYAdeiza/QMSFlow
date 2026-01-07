import LODEntryForm from "@/components/LODEntryForm";

export default function LODWorkstation() {
  return (
    <div className="p-8 space-y-12 bg-gray-50 min-h-screen">
      
      {/* SECTION 1: THE ENTRY FORM */}
      <section className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-black text-slate-900 uppercase">LOD Entry Portal</h1>
          <p className="text-gray-500">Register new applications and push to Director for assignment.</p>
        </header>
        
        {/* Your LODEntryForm Component goes here */}
        <LODEntryForm />
      </section>

      <hr className="border-gray-200" />

      {/* SECTION 2: THE TRACKING DASHBOARD */}
      <section className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Application Tracking</h2>
            <p className="text-sm text-gray-500">Real-time status of dossiers pushed to the Director.</p>
          </div>
          <div className="flex gap-4">
             {/* Future filters: [All] [Pending Director] [In Review] */}
          </div>
        </div>

        {/* --- DASHBOARD GOES IN HERE --- */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
           <div className="p-20 text-center flex flex-col items-center justify-center text-gray-400">
              <div className="w-16 h-16 bg-gray-100 rounded-full mb-4 flex items-center justify-center">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                 </svg>
              </div>
              <h3 className="font-bold text-slate-600 italic">Tracking Logic Coming Soon</h3>
              <p className="max-w-xs text-sm">Tomorrow, we will build a table here that pulls from your Supabase 'Applications' and 'QMS_Timelines' tables.</p>
           </div>
        </div>
        {/* --- END DASHBOARD --- */}

      </section>
    </div>
  );
}