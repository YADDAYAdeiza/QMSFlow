import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This client allows you to fetch the public URLs for your PDFs
export const supabase = createClient(supabaseUrl, supabaseAnonKey);