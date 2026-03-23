import { createClient } from '@supabase/supabase-js';

// URL والمفتاح من Supabase (يتم استردادهما من ملف .env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Supabase credentials not found. Please add them to your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
