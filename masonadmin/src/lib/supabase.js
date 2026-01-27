import { createClient } from '@supabase/supabase-js';

const runtimeEnv = window.__ENV__ || {};
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || runtimeEnv.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || runtimeEnv.VITE_SUPABASE_ANON_KEY;
const storageKey =
  import.meta.env.VITE_STORAGE_KEY || runtimeEnv.VITE_STORAGE_KEY || 'mason_auth';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey,
    storage: window.localStorage
  }
});
