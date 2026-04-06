import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'TU_SUPABASE_URL') {
  console.warn('⚠️ Supabase credentials missing in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
