/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Optional override; production default uses site_settings or https://sexwithmason.com */
  readonly VITE_MAIN_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
