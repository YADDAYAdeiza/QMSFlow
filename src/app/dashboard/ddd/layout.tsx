import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { 
  ShieldCheck, 
  Layers, 
  Search, 
  History,
  LayoutDashboard
} from "lucide-react";

export default async function DDDNestedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // 1. Verify Divisional Deputy Director Role
  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  // Security Gate: Only DDD or Admin can pass
  const allowedRoles = ["Divisional Deputy Director", "Admin"];
  if (!profile || !allowedRoles.includes(profile.role || "")) {
    redirect("/dashboard");
  }

  // Define the division for the UI branding
  const division = (profile.division || "VMD").toUpperCase();

  const navItems = [
    { name: 'Division Inbox', href: '/dashboard/ddd', icon: Layers },
    { name: 'Registry Search', href: '/dashboard/ddd/search', icon: Search },
    { name: 'Review History', href: '/dashboard/ddd/history', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* HORIZONTAL DDD NAVIGATION */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-10">
            {/* DIVISION BRANDING */}
            <div className="flex items-center gap-3 border-r border-slate-200 pr-8">
              <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-[11px] font-black uppercase tracking-tighter text-slate-900 leading-none">
                   Divisional Deputy Director
                </h2>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mt-1">
                  {division} Directorate
                </p>
              </div>
            </div>

            {/* NAVIGATION LINKS */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link 
                  key={item.name}
                  href={item.href} 
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all group"
                >
                  <item.icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* SYSTEM STATUS & LOGOUT (Inherited from Outer Layout usually) */}
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Secure Session: {profile.name?.split(' ')[0]}
                </span>
             </div>
          </div>
        </div>
      </nav>

      {/* DDD PAGE CONTENT */}
      <main className="flex-1">
        {/* We don't add extra padding here because your page.tsx already has p-8 */}
        {children}
      </main>

      {/* SUB-FOOTER */}
      <footer className="bg-slate-100/50 border-t border-slate-200 py-3 px-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          <span>© NAFDAC QMS Workflow Engine</span>
          <span className="flex items-center gap-2">
            <LayoutDashboard className="w-3 h-3" /> Division-Level Oversight Restricted
          </span>
        </div>
      </footer>
    </div>
  );
}