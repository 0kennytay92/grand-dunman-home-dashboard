// ─────────────────────────────────────────────────────────────
// ONLINE SYNC SETTINGS (Supabase)
// Both values are designed to be public: they only let the app
// *ask* Supabase for data, and the database rules (supabase/setup.sql)
// only give members of your home access to it.
// Never put the "secret" / "service_role" key here.
// Leave empty to run without online sync.
// ─────────────────────────────────────────────────────────────

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY: string = import.meta.env.VITE_SUPABASE_KEY ?? '';

export const cloudConfigured = SUPABASE_URL !== '' && SUPABASE_PUBLISHABLE_KEY !== '';
