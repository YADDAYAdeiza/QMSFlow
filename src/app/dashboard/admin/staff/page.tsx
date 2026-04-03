export const dynamic = "force-dynamic";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { 
  ShieldCheck, 
  UserPlus, 
  AlertCircle,
  Clock,
  UserCircle,
  XCircle
} from "lucide-react";

import DeleteStaffButton from "./DeleteStaffButton";

// FIX: searchParams must be a Promise in the type definition
export default async function StaffAdminPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = createClient();
  
  // FIX: You MUST await searchParams before using it
  const searchParams = await props.searchParams;

  // FIX: Use getUser() for security (replaces getSession)
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  // Authorization Check
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Divisional Deputy Director";
  if (!isAdmin) {
    const div = currentUser?.division?.toLowerCase() || "vmd";
    redirect(`/dashboard/${div}`);
  }

  const allStaff = await db.select().from(users).orderBy(asc(users.name));

  // --- SERVER ACTIONS ---
  async function addStaff(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string).toLowerCase().trim();
    const name = formData.get("name") as string;
    const division = formData.get("division") as string;
    const role = formData.get("role") as string;

    try {
      await db.insert(users).values({
        id: crypto.randomUUID(),
        email,
        name,
        division: division.toUpperCase(),
        role: role || "Staff Technical Reviewer",
        linkedAt: null,
      });
    } catch (error: any) {
       return redirect("/dashboard/admin/staff?error=Email already registered in system");
    }

    revalidatePath("/dashboard/admin/staff");
    redirect("/dashboard/admin/staff");
  }

  async function deleteStaff(formData: FormData) {
    "use server";
    const userId = formData.get("userId") as string;
    // user.id comes from the secure getUser() call
    if (userId === user.id) return; 
    await db.delete(users).where(eq(users.id, userId));
    revalidatePath("/dashboard/admin/staff");
  }

  return (
    <div className="p-10 bg-slate-50 min-h-screen font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">
            Staff Personnel Registry
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" /> 
            Authorized Admin: {currentUser?.name}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <section className="lg:col-span-1">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 sticky top-10">
              <div className="flex items-center gap-3 mb-8 text-blue-600">
                <div className="p-2 bg-blue-600 rounded-lg">
                    <UserPlus className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Onboard Personnel</h2>
              </div>

              {searchParams.error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <p className="text-[10px] font-bold uppercase leading-tight">{searchParams.error}</p>
                </div>
              )}

              <form action={addStaff} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase ml-2 text-slate-400">Full Name</label>
                  <input name="name" required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Dr. Jane Smith" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase ml-2 text-slate-400">Official Email</label>
                  <input name="email" type="email" required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="officer@agency.gov" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase ml-2 text-slate-400">Division</label>
                  <select name="division" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="VMD">VMD (Veterinary Medicine)</option>
                    <option value="PAD">PAD (Pesticides and Agrochemicals)</option>
                    <option value="AFPD">AFPD (Animal Feed and Premixes)</option>
                    <option value="IRSD">IRSD (Inspection)</option>
                    <option value="VMAP">VMAP (Directorate)</option>
                  </select>
                </div>

                <div className="space-y-1 pb-4">
                  <label className="text-[9px] font-black uppercase ml-2 text-slate-400">System Role</label>
                  <select name="role" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Staff Technical Reviewer">Staff Technical Reviewer</option>
                    <option value="Divisional Deputy Director">Divisional Deputy Director</option>
                    <option value="Admin">System Administrator</option>
                    <option value="LOD">LOD</option>
                    <option value="Director">Director</option>
                  </select>
                </div>

                <button type="submit" className="w-full py-5 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                  Register Personnel
                </button>
              </form>
            </div>
          </section>

          <section className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-6 text-[9px] font-black uppercase tracking-widest">Personnel</th>
                    <th className="p-6 text-[9px] font-black uppercase tracking-widest text-center">Unit</th>
                    <th className="p-6 text-[9px] font-black uppercase tracking-widest text-center">Status</th>
                    <th className="p-6 text-[9px] font-black uppercase tracking-widest text-right pr-10">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allStaff.map((person) => {
                    const isConnected = !!person.linkedAt;
                    return (
                      <tr key={person.id} className="border-b border-slate-100 last:border-none group hover:bg-blue-50/30 transition-colors">
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <UserCircle className="w-8 h-8 text-slate-300" />
                            <div>
                                <p className="font-bold text-slate-800 text-sm uppercase italic">{person.name}</p>
                                <p className="text-[10px] text-slate-400 lowercase">{person.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[9px] font-black uppercase">
                            {person.division}
                          </span>
                        </td>
                        <td className="p-6 text-center">
                          {isConnected ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[8px] font-black uppercase border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Connected
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[8px] font-black uppercase border border-amber-100">
                              <Clock className="w-3 h-3" />
                              Pending
                            </div>
                          )}
                        </td>
                        <td className="p-6 text-right pr-10">
                          {person.id !== user.id && (
                            <DeleteStaffButton 
                                userId={person.id} 
                                userName={person.name} 
                                deleteAction={deleteStaff} 
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}