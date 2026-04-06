import { supabase } from './supabase';

export type MasonRunnerRow = {
  id: string;
  player_name: string;
  score: number;
  created_at: string;
};

const TABLE = 'mason_runner_scores';

export async function fetchMasonRunnerLeaderboard(limit = 25) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id,player_name,score,created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);
  return { rows: (data || []) as MasonRunnerRow[], error };
}

export async function submitMasonRunnerScore(playerName: string, score: number) {
  const name = playerName.trim().slice(0, 32);
  if (!name || score < 0 || score > 2_000_000) {
    return { id: undefined as string | undefined, error: new Error('Invalid name or score') };
  }
  const { data, error } = await supabase.from(TABLE).insert([{ player_name: name, score: Math.floor(score) }]).select('id').maybeSingle();
  return { id: data?.id as string | undefined, error };
}
