"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ShieldCheck, Lock, Mail, Loader2, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { createClient } from '@/utils/supabase/client'; 
import { getRedirectPath } from './actions'; 

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      try {
        const path = await getRedirectPath(data.user.id);
        setSuccess(true);
        window.location.href = path;
      } catch (err: any) {
        console.error("Login Navigation Error:", err);
        setError("Authorized, but registry access failed. Contact Admin.");
        setLoading(false);
      }
    }
  };

  // Logic for Password Reset
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your official email first to reset access key.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className={`inline-flex p-4 rounded-3xl transition-all duration-500 ${
            success || resetSent ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-blue-600/10 border-blue-600/20'
          } border mb-6`}>
            {(success || resetSent) ? (
              <ShieldCheck className="w-10 h-10 text-emerald-500 animate-pulse" />
            ) : (
              <ShieldCheck className="w-10 h-10 text-blue-500" />
            )}
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic">
            Agency Terminal
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
            Authorized Personnel Only
          </p>
        </div>

        {resetSent ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] text-center animate-in fade-in zoom-in duration-300">
            <KeyRound className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-white font-black uppercase text-sm italic">Recovery Link Sent</h2>
            <p className="text-slate-500 text-[10px] mt-2 font-bold uppercase tracking-widest leading-relaxed">
              Check your official inbox for instructions to restore your terminal access key.
            </p>
            <button 
              onClick={() => setResetSent(false)}
              className="mt-6 text-[9px] font-black uppercase text-blue-500 hover:text-blue-400 tracking-widest"
            >
              Return to Login
            </button>
          </div>
        ) : success ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] text-center animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-white font-black uppercase text-sm italic">Authentication Verified</h2>
            <p className="text-slate-500 text-[10px] mt-2 font-bold uppercase tracking-widest leading-relaxed">
              Establishing secure connection to your division workspace...
            </p>
            <div className="mt-6 flex justify-center">
               <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="email" 
                placeholder="Email Address"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="password" 
                placeholder="Access Key"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="flex justify-end px-2">
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-[9px] font-black uppercase text-slate-600 hover:text-blue-500 tracking-widest transition-colors"
              >
                Forgot Access Key?
              </button>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in shake duration-300">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <p className="text-[10px] font-black uppercase text-rose-500 leading-tight">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : "Authenticate"}
            </button>
            
            <p 
              className="mt-6 text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:text-emerald-500 transition-colors"
              onClick={() => router.push('/signup')}
            >
              New Personnel? Create Account
            </p>
          </form>
        )}
      </div>
    </div>
  );
}