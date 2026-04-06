import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  console.warn('Masoncord: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (same project as mason-web).');
}

/** Same storage key as mason-web so logging in on either app shares the session. */
export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'mason_auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
