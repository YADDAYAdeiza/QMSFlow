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
  UserCircle
} from "lucide-react";

// Import our new Client Component for the delete action
import DeleteStaffButton from "./DeleteStaffButton";

export default async function StaffAdminPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // 1. AUTH & ROLE CHECK
  if (!session) redirect("/login");

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // Verification for Admin or DDD access
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Divisional Deputy Director";
  if (!isAdmin) {
    const div = currentUser?.division?.toLowerCase() || "vmd";
    redirect(`/dashboard/${div}`);
  }

  // 2. DATA FETCHING (Alphabetical for QMS Registry)
  const allStaff = await db.select().from(users).orderBy(asc(users.name));

  // 3. SERVER ACTIONS
  async function addStaff(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    const division = formData.get("division") as string;
    const role = formData.get("role") as string;

    await db.insert(users).values({
      email,
      name,
      division: division.toUpperCase(),
      role: role || "Staff Technical Reviewer",
    });

    revalidatePath("/dashboard/admin/staff");
  }

  async function deleteStaff(formData: FormData) {
    "use server";
    const userId = formData.get("userId") as string;
    
    // Safety: Prevent self-deletion
    if (userId === session.user.id) return;

    await db.delete(users).where(eq(users.id, userId));
    revalidatePath("/dashboard/admin/staff");
  }

  return (
    <div className="p-10 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">
              Staff Personnel Registry
            </h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> 
              Authorized Admin: {currentUser.name}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* LEFT: ONBOARDING FORM */}
          <section className="lg:col-span-1">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 sticky top-10">
              <div className="flex items-center gap-3 mb-8 text-blue-600">
                <div className="p-2 bg-blue-600 rounded-lg">
                    <UserPlus className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Onboard Personnel</h2>
              </div>

              <form action={addStaff} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase ml-2 text-slate-400">Full Name</label>
                  <input name="name" required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Dr. Jane Smith" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase ml-2 text-slate-400">Official Email</label>
                  <input name="email" type="email" required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="officer@agency.gov" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase ml-2 text-slate-400">Division</label>
                  <select name="division" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="VMD">VMD (Veterinary Medicine)</option>
                    <option value="PAD">PAD (Post-Registration)</option>
                    <option value="AFPD">AFPD (Animal Feed)</option>
                    <option value="IRSD">IRSD (Inspection)</option>
                  </select>
                </div>

                <div className="space-y-1 pb-4">
                  <label className="text-[9px] font-black uppercase ml-2 text-slate-400">System Role</label>
                  <select name="role" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Staff Technical Reviewer">Staff Technical Reviewer</option>
                    <option value="Divisional Deputy Director">Divisional Deputy Director</option>
                    <option value="Admin">System Administrator</option>
                  </select>
                </div>

                <button type="submit" className="w-full py-5 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                  Register Personnel
                </button>
              </form>
            </div>
          </section>

          {/* RIGHT: STAFF LIST */}
          <section className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-6 text-[9px] font-black uppercase tracking-widest">Personnel</th>
                    <th className="p-6 text-[9px] font-black uppercase tracking-widest text-center">Unit</th>
                    <th className="p-6 text-[9px] font-black uppercase tracking-widest text-center">Status</th>
                    <th className="p-6 text-[9px] font-black uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allStaff.map((person) => {
                    // Logic check for Supabase UUID via presence of hyphen
                    const isConnected = person.id && person.id.includes('-');
                    
                    return (
                      <tr key={person.id} className="border-b border-slate-100 last:border-none group hover:bg-blue-50/30 transition-colors">
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-full">
                                <UserCircle className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm uppercase italic tracking-tight">{person.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium font-mono lowercase">{person.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-6 text-center">
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-blue-100">
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

                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <span className={`text-[9px] font-black uppercase tracking-tighter ${person.role === 'Admin' ? 'text-rose-600' : 'text-slate-400'}`}>
                              {person.role === "Staff Technical Reviewer" ? "Reviewer" : person.role}
                            </span>
                            
                            {/* The Client Component Delete Button */}
                            {person.id !== session.user.id && (
                                <DeleteStaffButton 
                                    userId={person.id} 
                                    userName={person.name} 
                                    deleteAction={deleteStaff} 
                                />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {allStaff.length === 0 && (
                <div className="p-20 text-center">
                    <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Registry Empty</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}