import Link from 'next/link';
import { ShieldCheck, LogIn, ArrowRight, Sparkles, Mail } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md text-center space-y-8">
        {/* Icon / Logo Area */}
        <div className="inline-flex p-5 rounded-3xl bg-blue-600/10 border border-blue-600/20 mb-2">
          <ShieldCheck className="w-12 h-12 text-blue-500" />
        </div>

        {/* Messaging */}
        <div className="space-y-3">
          <h1 className="text-6xl font-black text-white italic tracking-tighter">
            NigVetStat <span className="text-blue-500 ml-5"></span>
          </h1>
          <p className="text-slate-400 text-2xl font-medium leading-relaxed">
            Authorized Regulatory Access Only. <br />
          </p>
        </div>

        {/* Action Area */}
        <div className="pt-4 space-y-6">
          <Link 
            href="/login"
            className="group relative flex items-center justify-center gap-3 bg-white text-slate-950 py-5 px-8 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Log Into Application
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Updatable Features Section */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-left space-y-3 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2 text-blue-400 font-bold uppercase text-[10px] tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              System Updates
            </div>
            
            <div className="flex gap-3 items-start bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Optional Email Dispatch Available
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Turn on the toggle switch during dispatch to instantly notify the receiving officer.
                </p>
              </div>
            </div>
          </div>
          
          <p className="mt-8 text-[10px] text-slate-600 uppercase font-bold tracking-widest">
            National Agency for Food & Drug Administration & Control
          </p>
        </div>
      </div>
    </div>
  );
}