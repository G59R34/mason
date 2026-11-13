import { supabase } from './supabase';

export type MasonBotMessage = { role: 'user' | 'assistant'; content: string };

/** Supabase edge function that fronts Groq. Deployed as `smooth-service`. */
const FUNCTION_NAME = import.meta.env.VITE_MASON_BOT_FUNCTION?.trim() || 'smooth-service';

export const MASON_BOT_GREETING =
  "I'm Mason Bot. Mason is a real man with real sessions and a 4-to-12-business-day texting problem. I'm the part of the business that answers. Ask me anything — I'm the $2.50 version of him, so manage your expectations accordingly.";

export const MASON_BOT_STARTERS = [
  'What does it cost?',
  'How fast do you reply?',
  'Can you book me?',
];

async function messageFromError(error: unknown) {
  const context = (error as { context?: Response }).context;
  if (context && typeof context.clone === 'function') {
    try {
      const body = (await context.clone().json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      /* non-JSON error body — fall through */
    }
  }
  const message = (error as { message?: string })?.message?.trim() || '';
  if (/failed to send a request|failed to fetch|networkerror/i.test(message)) {
    return 'Mason Bot is not live on Supabase yet. Deploy the mason-bot function and it will answer.';
  }
  return message || 'No answer. Try again.';
}

export type MasonBotReview = { rating: number; comment: string };

/**
 * Asks the function to judge the chat and, if it lands, post a public review of it.
 * Resolves null when nothing was funny enough (or it declined).
 */
export async function maybeDropReview(messages: MasonBotMessage[]): Promise<MasonBotReview | null> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action: 'review', messages },
  });
  if (error) return null;
  const result = data as { posted?: boolean; review?: MasonBotReview } | null;
  if (!result?.posted || !result.review) return null;
  return result.review;
}

export async function askMasonBot(messages: MasonBotMessage[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { messages },
  });

  if (error) throw new Error(await messageFromError(error));

  const reply = (data as { reply?: string } | null)?.reply?.trim();
  if (!reply) throw new Error('Mason Bot said nothing. On brand, still useless.');
  return reply;
}
