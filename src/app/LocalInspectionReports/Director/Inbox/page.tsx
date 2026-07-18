// app/director-inbox/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DirectorInbox from '@/components/LocalInspectionReports/Director/DirectorInbox';

export const revalidate = 0; // Ensure fresh data on every request

export default async function DirectorInboxPage() {
  const supabase = await createClient();

  // 1. Authenticate user session on the server
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // 2. Verify authorization profile role on the server
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('email', user.email)
    .maybeSingle();

  if (!profile || profile.role !== 'Director') {
    redirect('/unauthorized');
  }

  // 3. Fetch initial database queue items on the server
  const { data: applications, error } = await supabase
    .from('applications')
    .select('*')
    .eq('current_point', 'Director Final Approval & Sign-Off')
    .eq('status', 'PENDING_FINAL_SIGN_OFF')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Failed to retrieve records:", error.message);
  }

  return (
    <DirectorInbox 
      initialItems={applications || []} 
      userEmail={user.email} 
    />
  );
}