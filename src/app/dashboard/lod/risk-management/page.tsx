import { getRiskInventory, getInspectionDeadlines } from "@/lib/actions/risk";
import RiskTable from "@/components/RiskTable";
import InspectionExpiryDropdown from "@/components/InspectionExpiryDropdown";
import { ShieldCheck, Database, Filter, AlertTriangle } from "lucide-react";

export default async function RiskManagementPage() {
  // Fetching inventory. Ensure 'data' includes 'applicationId' and 'status'
  const [{ data, success }, deadlines] = await Promise.all([
    getRiskInventory(),
    getInspectionDeadlines()
  ]);

  return (
    <div className="p-10 space-y-8 bg-slate-50/50 min-h-screen">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            Risk Inventory
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
            <Database className="w-3 h-3 text-blue-500" /> Unified Regulatory Risk Ledger
          </p>
        </div>
        
        <div className="flex gap-3">
          <InspectionExpiryDropdown deadlines={deadlines} />

          <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Filter className="w-4 h-4 text-slate-400" /> Filter by Division
          </button>

          <div className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> 
            Active Assets: {data?.length || 0}
          </div>
        </div>
      </header>

      {success && data ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
           {/* The Link logic happens INSIDE this component */}
           <RiskTable data={data} />
        </div>
      ) : (
        <div className="p-20 bg-white border border-dashed border-slate-200 rounded-[3rem] text-center">
          <AlertTriangle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">No risk assessments found. Start by processing an LOD.</p>
        </div>
      )}
    </div>
  );
}