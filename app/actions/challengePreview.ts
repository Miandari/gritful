import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client with the anon key, no cookie/request context needed.
 * Safe to use inside unstable_cache and generateMetadata.
 */
function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export interface ChallengePreview {
  name: string;
  description: string | null;
  creator: { username: string; avatar_url: string | null };
  participantCount: number;
  metrics: any[];
  starts_at: string;
  ends_at: string | null;
  duration_days: number | null;
}

/**
 * Fetch public challenge preview data for unauthenticated users.
 * Uses standard client -- relies on anon RLS policies.
 *
 * Error semantics:
 * - Returns null: challenge doesn't exist or is private (indistinguishable, RLS-enforced)
 * - Throws: network/DB error (callers must catch; prevents cache poisoning)
 */
export async function getChallengePreview(challengeId: string): Promise<ChallengePreview | null> {
  const supabase = createAnonClient();

  const { data: challenge, error } = await supabase
    .from('challenges')
    .select('name, description, creator_id, starts_at, ends_at, duration_days, metrics')
    .eq('id', challengeId)
    .single() as any;

  if (error) {
    if (error.code === 'PGRST116') return null; // not found or private (RLS blocked)
    throw error; // network error -- must propagate
  }

  // Fetch creator profile + participant count concurrently (no dependency)
  const [{ data: creator }, { data: participantCount }] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', challenge.creator_id)
      .single(),
    (supabase.rpc as any)('get_public_challenge_participant_count', {
      p_challenge_id: challengeId,
    }),
  ]);

  return {
    name: challenge.name,
    description: challenge.description,
    creator: creator || { username: 'Unknown', avatar_url: null },
    participantCount: participantCount || 0,
    metrics: (challenge.metrics as any[]) || [],
    starts_at: challenge.starts_at,
    ends_at: challenge.ends_at,
    duration_days: challenge.duration_days,
  };
}
