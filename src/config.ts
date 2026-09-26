// ─────────────────────────────────────────────────────────────
// ONLINE SYNC SETTINGS (Supabase)
// Both values are designed to be public: they only let the app
// *ask* Supabase for data, and the database rules (supabase/setup.sql)
// only give members of your home access to it.
// Never put the "secret" / "service_role" key here.
// Set both to '' to run without online sync.
// ─────────────────────────────────────────────────────────────

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? 'https://kptvjirvdxfkorbxdwfm.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY: string = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_Wos5O6drKgN7fm0aLfVBFA_ERtGyoxi';

export const cloudConfigured = SUPABASE_URL !== '' && SUPABASE_PUBLISHABLE_KEY !== '';
