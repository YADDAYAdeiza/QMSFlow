import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { 
  LayoutDashboard, 
  BarChart3, 
  ShieldCheck, 
  UserCircle,
  Timer,
  Globe 
} from "lucide-react";

export default async function DirectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  // 1. Session Protection
  if (authError || !authUser) {
    redirect("/login");
  }

  // 2. Role & Profile Lookup
  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!profile) {
    redirect("/login?error=unregistered");
  }

  /**
   * 3. ZONED ACCESS LOCK (Director Level)
   * Ensures only authorized personnel access this administrative tier.
   */
  const isAuthorized = profile.role === "Director" || profile.role === "Admin";
  
  if (!isAuthorized) {
    const fallbackZone = (profile.division || "VMD").toLowerCase();
    console.warn(`🚨 UNAUTHORIZED DIR-ACCESS: ${profile.email} redirected to ${fallbackZone}`);
    redirect(`/dashboard/${fallbackZone}`);
  }

  const userDivision = (profile.division || "VMD").toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* SHARED DIRECTOR NAVIGATION BAR */}
      {/* h-20 (80px) height. z-50 ensures it stays above 'fixed' child components */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 h-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 h-full flex items-center justify-between">
          
          <div className="flex items-center gap-8">
            {/* BRANDING SECTION */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-200">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tighter text-slate-900 leading-none">
                  Directorate Portal
                </h2>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">
                  {userDivision} Management
                </p>
              </div>
            </div>

            <div className="h-10 w-[1px] bg-slate-100 mx-2 hidden md:block" />

            {/* NAVIGATION TABS */}
            <div className="flex items-center gap-1">
              <Link 
                href="/dashboard/director" 
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
              >
                <LayoutDashboard className="w-4 h-4" /> Workspace
              </Link>

              <Link 
                href="/dashboard/director/applications" 
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
              >
                <Globe className="w-4 h-4" /> Master Tracker
              </Link>

              <Link 
                href="/dashboard/director/performance" 
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
              >
                <Timer className="w-4 h-4" /> Performance
              </Link>

              <Link 
                href="/dashboard/director/analytics" 
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
              >
                <BarChart3 className="w-4 h-4" /> Analytics
              </Link>
            </div>
          </div>

          {/* USER PROFILE SECTION */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-900 uppercase">
                {profile.name}
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                {profile.role === 'Admin' ? 'System Administrator' : 'Divisional Deputy Director'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <UserCircle className="w-6 h-6" />
            </div>
          </div>

        </div>
      </nav>

      {/* PAGE CONTENT */}
      {/* pt-20 provides the offset for non-fixed pages. 
          flex-1 ensures the main area expands to fill the screen.
      */}
      <main className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto h-full px-8">
          {children}
        </div>
      </main>

      {/* FOOTER STATUS */}
      <footer className="bg-white border-t border-slate-200 py-4 px-8 mt-auto z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Secure • {userDivision} Directorate
          </div>
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            NAFDAC Regulatory Cloud v2.0
          </p>
        </div>
      </footer>
    </div>
  );
}