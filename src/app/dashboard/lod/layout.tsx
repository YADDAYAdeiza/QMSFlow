import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { 
  ClipboardCheck, 
  Timer, 
  BarChart4, 
  ShieldAlert,
  ShieldCheck,
  UserCircle,
  Globe
} from "lucide-react";

export default async function LODHorizontalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // 1. Management Role Verification
  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  const managementRoles = ["LOD", "Director", "Admin"];
  
  if (!profile || !managementRoles.includes(profile.role || "")) {
    // Standard staff are bounced to their division
    redirect(`/dashboard/${(profile?.division || "VMD").toLowerCase()}`);
  }

  const division = (profile.division || "VMD").toUpperCase();

  const navItems = [
    { name: 'LOD Inbox', href: '/dashboard/lod', icon: ClipboardCheck },
    { name: 'Master Tracker', href: '/dashboard/lod/applications', icon: Globe },
    { name: 'Performance', href: '/dashboard/lod/performance', icon: Timer },
    { name: 'Risk Management', href: '/dashboard/lod/risk-management', icon: ShieldCheck },
    { name: 'Analytics', href: '/dashboard/lod/analytics', icon: BarChart4 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* HORIZONTAL LOD NAVIGATION */}
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-10">
            {/* BRANDING SECTION */}
            <div className="flex items-center gap-3 border-r border-slate-800 pr-8">
              <div className="bg-amber-500 p-2 rounded-xl shadow-lg shadow-amber-500/20">
                <ShieldAlert className="w-5 h-5 text-slate-900" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tighter text-white leading-none">
                  Liaison Office
                </h2>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] mt-1">
                  {division} Directorate
                </p>
              </div>
            </div>

            {/* NAV LINKS */}
            <div className="flex items-center gap-2">
              {navItems.map((item) => (
                <Link 
                  key={item.name}
                  href={item.href} 
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-800 transition-all group"
                >
                  <item.icon className="w-4 h-4 text-slate-500 group-hover:text-amber-500" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* USER PROFILE SECTION */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-white uppercase leading-none mb-1">
                {profile.name}
              </p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Liaison Officer
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
              <UserCircle className="w-6 h-6" />
            </div>
          </div>

        </div>
      </nav>

      {/* PAGE CONTENT */}
      {/* pt-20 added to match the h-20 nav height and prevent occlusion */}
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="max-w-7xl mx-auto p-10">
          {children}
        </div>
      </main>

      {/* FOOTER STATUS */}
      <footer className="bg-white border-t border-slate-200 py-4 px-10 mt-auto">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            LOD Oversight Console • Restricted Access
          </div>
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            {division} Division • QMS {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}