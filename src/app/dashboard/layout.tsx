"use client";

import React from 'react';
import { createClient } from '@/utils/supabase/client'; 
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Inbox, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  ChevronRight,
  Users
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const menuItems = [
    { name: 'Overview', icon: LayoutDashboard, href: '/dashboard/vmd' },
    { name: 'Inbox', icon: Inbox, href: '/dashboard/vmd/inbox' },
    { name: 'Staff Registry', icon: Users, href: '/dashboard/admin/staff' },
    { name: 'Settings', icon: Settings, href: '/dashboard/settings' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* SIDEBAR - Locked to screen height */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col border-r border-slate-800 h-screen sticky top-0">
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 leading-none mb-1">QMS Portal</p>
              <p className="text-sm font-black uppercase tracking-tight italic">Agency Admin</p>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all group ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                    <span className="text-[11px] font-black uppercase tracking-widest">{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3 h-3 text-white/50" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* SIGN OUT SECTION - Now always visible at the bottom of the sidebar */}
        <div className="p-8 border-t border-slate-800 bg-slate-900">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full p-4 rounded-2xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all group"
          >
            <LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-500" />
            <span className="text-[11px] font-black uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT - Only this area scrolls */}
      <main className="flex-1 overflow-y-auto p-10">
        {children}
      </main>
    </div>
  );
}