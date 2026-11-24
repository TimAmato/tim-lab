// Shared Supabase settings for every app in tim-lab.
// These two values are PUBLIC by design (safe to commit). Never put the
// secret / service_role key here or anywhere else in this repo.
//
// Shared with the Market Lens Supabase project (free plan allows 2 projects).
// In Supabase URL Configuration, never change the Site URL (Market Lens uses it);
// tim-lab only adds the redirect URL https://timamato.github.io/tim-lab/**
export const SUPABASE_URL = 'https://fatvodqjfpcxqsjfkmlm.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_UBshFlQH7cFMMwEHzKiK8g_8vbg6vKK';

export const isSupabaseConfigured =
  !SUPABASE_URL.includes('YOUR-PROJECT-REF') &&
  !SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR-');
