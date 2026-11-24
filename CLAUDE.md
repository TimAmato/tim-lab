# tim-lab: rules for every session

## How I work
- Owner: Tim. I usually start sessions from my phone with a short spoken prompt. Fill in sensible defaults instead of asking questions. Only stop to ask if a decision can't be undone or needs a credential I haven't provided.
- Finish to a working, tested, ready-to-merge state in one session whenever possible.

## New app workflow
1. Create apps/<kebab-case-name>/. Never modify other apps unless I ask.
2. Default stack: plain HTML/CSS/JS. Use Vite only if the app truly needs a framework, and set base: '/tim-lab/<name>/'.
3. Mobile-first: it must look and work well on an iPhone screen.
4. Add tests (at minimum: build succeeds and core logic is unit-tested). Run npm run build and npm test before finishing.
5. Never push to main. Open a PR titled "New app: <name>" with a short summary, and end your final message with the live URL after merge: https://timamato.github.io/tim-lab/<name>/

## Login and data (Supabase)
- Always use the shared client in shared/supabase.js. Never create another Supabase project or client config.
- Google sign-in: supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
- Prefix tables with the app name: <app>_<table> (e.g. tailgate_events).
- Every table MUST have row-level security enabled, with policies limiting rows to auth.uid(). No table ships without RLS.
- Write schema as SQL files in apps/<name>/supabase/migrations/. I run them in the Supabase SQL editor, so tell me exactly which file to run.

## Secrets
- The Supabase URL and publishable key are public by design and live in shared/config.js.
- NEVER commit or ask for the Supabase secret/service_role key, Alpaca keys, or any other private credential. If an app needs a private API key, stop and tell me what to create and where to put it.
- No live-money trading code in this repo, ever.

## Out of scope
- Apps that need their own domain, a custom server, or private API keys get their own repo and Vercel project. Tell me when a request crosses that line instead of forcing it in here.
