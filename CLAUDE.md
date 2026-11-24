# tim-lab: rules for every session

## How I work
- Owner: Tim. I usually start sessions from my phone with a short spoken prompt. Fill in sensible defaults instead of asking questions. Only stop to ask if a decision can't be undone or needs a credential I haven't provided.
- Finish to a working, tested, ready-to-merge state in one session whenever possible.

## New app workflow
1. Create apps/<kebab-case-name>/. Never modify other apps unless I ask.
2. Default stack: plain HTML/CSS/JS. Use Vite only if the app truly needs a framework, and set base: '/tim-lab/<name>/'.
3. Mobile-first: it must look and work well on an iPhone screen.
4. Add tests (at minimum: build succeeds and core logic is unit-tested). Before finishing run npm run build, npm test, and npm run smoke (iPhone-size browser check; if Chromium is missing run npx playwright install chromium first, and if it can't be installed, say so and rely on CI). Look at smoke-screenshots/<name>.png yourself and fix anything that looks off.
5. Never push to main. Open a PR titled "New app: <name>" (or "Update <name>: <change>") with a short summary. End your final message with the live URL: https://timamato.github.io/tim-lab/<name>/
6. Auto-merge: CI builds, tests and runs the iPhone check on every PR. If it passes and the PR only touches files inside ONE apps/<name>/ folder, CI merges and deploys it automatically (live about 2 minutes later). So keep every change inside the app's own folder. If a change truly needs shared/, scripts/, the workflow or CLAUDE.md, put it in a separate PR and tell me it needs my manual merge.
7. Don't mark the PR ready (or open it non-draft) until everything works, including any database migration already applied.

## Login and data (Supabase)
- Always use the shared client in shared/supabase.js. Never create another Supabase project or client config.
- Google sign-in: supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
- Prefix tables with the app name: <app>_<table> (e.g. tailgate_events).
- Every table MUST have row-level security enabled, with policies limiting rows to auth.uid(). No table ships without RLS.
- Write schema as SQL files in apps/<name>/supabase/migrations/ (numbered: 001_..., 002_...).
- The Supabase project is SHARED with Market Lens, a live app I use daily (project ref fatvodqjfpcxqsjfkmlm). Never change its Auth URL settings, other apps' tables, or anything in the auth, storage or other non-public schemas.

## Applying migrations (Supabase connector)
Apply the app's migration yourself with the Supabase connector (apply_migration on project fatvodqjfpcxqsjfkmlm), BEFORE opening the PR, only if ALL of these are true:
- It only creates or alters tables, indexes, policies, triggers and functions whose names start with <app>_ (e.g. todo_items, todo_set_done_at).
- It contains no DROP, TRUNCATE, DELETE or UPDATE of existing data, no ALTER of anything not prefixed <app>_, no GRANT to anon, and no SECURITY DEFINER function.
- Every new table has RLS enabled and auth.uid() policies in the same file.
- Before applying, list existing tables (list_tables) and confirm no name clash.
After applying, run the security advisor (get_advisors, type security) and fix any new issue for your tables. Never re-run a migration that's already applied; check list_migrations first.
If any rule isn't met, or the connector isn't available, don't apply it: open the PR as a draft and tell me exactly which file to run in the Supabase SQL editor.

## Design (every app)
- Feel like a polished iPhone app, not a web page: system font (-apple-system, system-ui), generous spacing, 16px+ body text, one accent color, rounded corners.
- Support light and dark mode (color-scheme: light dark, or prefers-color-scheme).
- <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">, respect env(safe-area-inset-*), use 100dvh, never scroll sideways.
- Tap targets at least 44px, inputs at least 16px font (stops iOS zoom), touch-action: manipulation on buttons, clear pressed states.
- Every state is designed: loading, empty, error, signed-out. Errors are friendly sentences, never raw codes.
- Give the page a real <title> (it's the name on the tim-lab home page) and a theme-color meta tag.

## Secrets
- The Supabase URL and publishable key are public by design and live in shared/config.js.
- NEVER commit or ask for the Supabase secret/service_role key, Alpaca keys, or any other private credential. If an app needs a private API key, stop and tell me what to create and where to put it.
- No live-money trading code in this repo, ever.

## Out of scope
- Apps that need their own domain, a custom server, or private API keys get their own repo and Vercel project. Tell me when a request crosses that line instead of forcing it in here.
