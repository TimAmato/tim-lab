// The ONE Supabase client for every app in tim-lab.
//
// Usage from a plain HTML app (apps/<name>/app.js, loaded with type="module"):
//   import { supabase } from '../shared/supabase.js';
//
// The deployed layout is /tim-lab/<name>/ and /tim-lab/shared/, so the
// relative path '../shared/supabase.js' works both on GitHub Pages and when
// you serve dist/ locally (npm run build && npx serve dist).
//
// Vite apps: import from the absolute URL '/tim-lab/shared/supabase.js' and
// mark it external in vite.config.js (build.rollupOptions.external).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}
