import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Load reviews without listing columns — avoids PostgREST errors when optional columns (mason_reply, verified, owner) are missing. */
export async function fetchReviews(options: { limit?: number } = {}) {
  let q = supabase.from('reviews').select('*').order('created_at', { ascending: false });
  if (options.limit != null) q = q.limit(options.limit);
  const { data, error } = await q;
  return { rows: data ?? [], error: error as PostgrestError | null };
}
