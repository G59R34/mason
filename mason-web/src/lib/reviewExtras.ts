import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type ReviewReplyRow = {
  id: string;
  review_id: string;
  name: string | null;
  message: string;
  created_at: string;
  owner?: string | null;
};

export async function probeReviewExtras(): Promise<{ replies: boolean; votes: boolean }> {
  const [r1, r2] = await Promise.all([
    supabase.from('review_replies').select('id').limit(1),
    supabase.from('review_votes').select('id').limit(1),
  ]);
  return { replies: !r1.error, votes: !r2.error };
}

export async function fetchRepliesForReviewIds(ids: string[]) {
  if (!ids.length) {
    return { byReview: {} as Record<string, ReviewReplyRow[]>, error: null as PostgrestError | null };
  }
  const { data, error } = await supabase
    .from('review_replies')
    .select('*')
    .in('review_id', ids)
    .order('created_at', { ascending: true });
  if (error) return { byReview: {}, error: error as PostgrestError };
  const byReview: Record<string, ReviewReplyRow[]> = {};
  for (const row of data || []) {
    const r = row as ReviewReplyRow;
    const rid = String(r.review_id);
    if (!byReview[rid]) byReview[rid] = [];
    byReview[rid].push(r);
  }
  return { byReview, error: null };
}

export async function fetchVoteScores(reviewIds: string[]) {
  if (!reviewIds.length) {
    return { scores: {} as Record<string, number>, error: null as PostgrestError | null };
  }
  const { data, error } = await supabase.from('review_votes').select('review_id,vote').in('review_id', reviewIds);
  if (error) return { scores: {}, error: error as PostgrestError };
  const scores: Record<string, number> = {};
  for (const row of data || []) {
    const id = String((row as { review_id: string }).review_id);
    scores[id] = (scores[id] || 0) + Number((row as { vote: number }).vote);
  }
  return { scores, error: null };
}

export async function insertReviewVote(reviewId: string, voter: string | null, vote: 1 | -1) {
  const { data: auth } = await supabase.auth.getUser();
  const base = { review_id: reviewId, voter: voter || null, vote };
  if (auth?.user?.id) {
    const { error } = await supabase.from('review_votes').insert([{ ...base, owner: auth.user.id }]);
    if (!error) return null;
    if (!/owner|column|42703/i.test(error.message)) return error as PostgrestError;
  }
  const { error } = await supabase.from('review_votes').insert([base]);
  return error as PostgrestError | null;
}

export async function insertReviewReply(reviewId: string, name: string, message: string) {
  const { data: auth } = await supabase.auth.getUser();
  const base = { review_id: reviewId, name: name.trim() || 'Guest', message: message.trim() };
  if (auth?.user?.id) {
    const { error } = await supabase.from('review_replies').insert([{ ...base, owner: auth.user.id }]);
    if (!error) return null;
    if (!/owner|column|42703/i.test(error.message)) return error as PostgrestError;
  }
  const { error } = await supabase.from('review_replies').insert([base]);
  return error as PostgrestError | null;
}

export async function fetchAdminUserIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('admins').select('user_id');
  if (error) return new Set();
  return new Set((data || []).map((r: { user_id: string }) => r.user_id));
}
