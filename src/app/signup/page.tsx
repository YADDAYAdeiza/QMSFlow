"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, User, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Create the user in Supabase Auth
    // We pass the name in 'options' so the SQL Trigger can grab it if needed
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setSuccess(true);
      setLoading(false);
      // Wait 3 seconds so they can see the success message, then teleport to login
      setTimeout(() => router.push('/login'), 3000);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans text-center">
        <div className="max-w-md w-full space-y-6">
          <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase italic">Registration Successful</h2>
          <p className="text-slate-400 text-sm">
            Your account is now linked to the Agency Registry. <br/> 
            Redirecting to the Secure Terminal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-3xl bg-blue-600/10 border border-blue-600/20 mb-6">
            <ShieldCheck className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic">
            Create Personnel Account
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
            Link your Official Identity to the Terminal
          </p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Full Name (As in Registry)"
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="email" 
              placeholder="Official Email"
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="password" 
              placeholder="Set Access Key"
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <p className="text-[10px] font-black uppercase text-rose-500 leading-tight">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Registration"}
          </button>
        </form>
        
        <p className="mt-8 text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest cursor-pointer hover:text-blue-400" onClick={() => router.push('/login')}>
          Already have an account? Return to Login
        </p>
      </div>
    </div>
  );
}