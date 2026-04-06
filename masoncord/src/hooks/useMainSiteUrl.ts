import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/** Canonical public URL when site_settings and env are unset. */
export const DEFAULT_MAIN_SITE_URL = 'https://sexwithmason.com';

/**
 * Resolves the main marketing site URL: site_settings `main_site_url`, then
 * `VITE_MAIN_SITE_URL`, then {@link DEFAULT_MAIN_SITE_URL}.
 */
export function useMainSiteUrl(): string {
  const envUrl = (import.meta.env.VITE_MAIN_SITE_URL as string | undefined)?.trim();
  const [url, setUrl] = useState(() => envUrl || DEFAULT_MAIN_SITE_URL);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'main_site_url')
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) return;
        const u = (data?.value as { url?: string } | null)?.url?.trim();
        if (u) setUrl(u);
        else setUrl(envUrl || DEFAULT_MAIN_SITE_URL);
      });
    return () => {
      cancelled = true;
    };
  }, [envUrl]);

  return url;
}
