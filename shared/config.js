// Shared Supabase settings for every app in tim-lab.
// These two values are PUBLIC by design (safe to commit). Never put the
// secret / service_role key here or anywhere else in this repo.
//
// Fill these in from Supabase > Project Settings > API Keys.
export const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'YOUR-PUBLISHABLE-KEY';

export const isSupabaseConfigured =
  !SUPABASE_URL.includes('YOUR-PROJECT-REF') &&
  !SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR-');
