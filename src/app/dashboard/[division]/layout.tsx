import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { 
  ClipboardCheck, 
  History, 
  FileSearch, 
  CircleUser
} from "lucide-react";
import Link from "next/link";

export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ division: string }>;
}) {
  const { division: urlDivision } = await params;
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!profile) redirect("/login?error=unregistered");

  // Normalize for comparison
  const userDivision = (profile.division || "").toLowerCase().trim();
  const requestedDivision = urlDivision.toLowerCase().trim();

  // SECURITY GATE: Redirect if not Admin and accessing the wrong division
  if (profile.role !== "Admin" && userDivision !== requestedDivision) {
    return redirect(`/dashboard/${userDivision}`);
  }

  const navItems = [
    { name: 'Active Queue', href: `/dashboard/${userDivision}`, icon: ClipboardCheck },
    { name: 'My History', href: `/dashboard/${userDivision}/history`, icon: History },
    { name: 'Dossier Search', href: `/dashboard/${userDivision}/search`, icon: FileSearch },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <nav className="bg-slate-900 text-white h-16 border-b border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-[10px]">
              {userDivision.toUpperCase()[0] || 'S'}
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {userDivision.toUpperCase()} Specialist Portal
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 group"
              >
                <item.icon className="w-3.5 h-3.5 group-hover:text-blue-500 transition-colors" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
             <p className="text-[9px] font-black text-slate-500 uppercase leading-none mb-1">Authenticated</p>
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-tighter leading-none">
                {profile.name || "Specialist"}
             </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
             <CircleUser className="w-5 h-5 text-slate-500" />
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>
    </div>
  );
}