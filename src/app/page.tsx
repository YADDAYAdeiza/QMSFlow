import Link from 'next/link';
import { ShieldCheck, LogIn, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      {/* Background Glow Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />

      <div className="relative w-full max-w-md text-center space-y-8">
        {/* Icon / Logo Area */}
        <div className="inline-flex p-5 rounded-3xl bg-blue-600/10 border border-blue-600/20 mb-2">
          <ShieldCheck className="w-12 h-12 text-blue-500" />
        </div>

        {/* Messaging */}
        <div className="space-y-3">
          <h1 className="text-6xl font-black text-white italic tracking-tighter italic">
            NigVetStat <span className="text-blue-500 ml-5"></span>
          </h1>
          <p className="text-slate-400 text-2xl font-medium leading-relaxed">
            Authorized Regulatory Access Only. <br />
          </p>
            {/* <span className='text-2xl'>Please authenticate to access the LOD Workstation and Registry.</span> */}
        </div>

        {/* Action Area */}
        <div className="pt-4">
          <Link 
            href="/login"
            className="group relative flex items-center justify-center gap-3 bg-white text-slate-950 py-5 px-8 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Log Into Application
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          
          <p className="mt-8 text-[10px] text-slate-600 uppercase font-bold tracking-widest">
            National Agency for Food & Drug Administration & Control
          </p>
        </div>
      </div>
    </div>
  );
}