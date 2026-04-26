import { MailCheck, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans text-center">
      <div className="max-w-md w-full">
        {/* ICON ANIMATION */}
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse" />
          <div className="relative p-6 rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-2xl">
            <MailCheck className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-4">
          Verify Your Credentials
        </h1>
        
        <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10">
          A secure verification link has been dispatched to your official email. 
          Please authorize your workstation by clicking the link to complete the 
          <span className="text-blue-500 font-bold"> Regulatory Personnel Handshake.</span>
        </p>

        {/* INSTRUCTIONAL BOX */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl mb-8 text-left">
          <div className="flex gap-4 items-start">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest mb-1">Security Protocol</p>
              <p className="text-[11px] text-slate-500 leading-normal italic">
                Check your spam folder if the email does not arrive within 60 seconds. 
                The link will expire in 24 hours for security purposes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Link 
            href="/login" 
            className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Login
          </Link>
        </div>

        <footer className="mt-20">
          <p className="text-[9px] font-black uppercase text-slate-700 tracking-[0.4em]">
            National Food & Drug Agency • Secure Portal
          </p>
        </footer>
      </div>
    </div>
  );
}