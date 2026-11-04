# Ajaia Docs

A lightweight collaborative document editor built with React, TypeScript, Vite, Tailwind CSS, Tiptap, and Supabase. Users can create and edit rich-text documents, import `.txt` and `.md` files, and share documents with existing registered users as editors or viewers.

## Features

- Supabase email/password sign-up and sign-in.
- Document dashboard with owned, shared, recent, and searchable views.
- Rich-text editing (bold, italic, underline, headings, lists, undo/redo).
- Debounced cloud autosave with explicit saving, saved, and failed states.
- `.txt` and `.md` import with a 5 MB limit and basic Markdown structure conversion.
- Sharing with existing registered users, editor/viewer permissions, collaborator listing, and revocation.
- PostgreSQL row-level security for document and share access.
- Responsive interface, automated unit/component tests, and Vercel SPA configuration.

Cloud functionality requires a configured Supabase project. When environment values are absent, the app displays a setup screen rather than implying that local or mock persistence is available.

## Technology

- React 18, TypeScript, Vite 6, Tailwind CSS 3
- Tiptap 2 and Lucide React
- Supabase Auth, PostgreSQL, and Row Level Security
- Vitest, jsdom, and React Testing Library

## Prerequisites

- Node.js 20.19+ or 22.12+ (required by Vite 6)
- npm
- A Supabase project for sign-in, cloud persistence, and sharing

## Install and run locally

```powershell
npm install
Copy-Item .env.example .env.local
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`, apply the schema described below, then:

```powershell
npm run dev
```

Vite prints the local URL (normally `http://localhost:5173`). Do not put a Supabase service-role key in the frontend.

## Supabase setup

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. In **Project Settings → API**, copy the Project URL and the `anon`/publishable public key into `.env.local`.
3. Open **SQL Editor**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. The script creates the profile sync trigger, documents and sharing tables, indexes, helper functions, RPCs, and RLS policies.
4. In **Authentication → Providers**, enable Email. Configure email confirmation to match your test/deployment setup.
5. In **Project Settings → API → Exposed schemas**, do not add `private`; the RLS helper functions are intentionally kept out of PostgREST.
6. Restart Vite after changing environment values.
7. Create accounts through the app or Supabase Auth. Profile rows are maintained by a database trigger; sharing only grants access to an existing account.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon/publishable key |

`.env*` files are ignored by Git; `.env.example` is safe to commit. Use the same variable names in Vercel Project Settings.

### Demo accounts

No shared demo credentials are provisioned. Create two accounts using distinct email addresses you control (or use Supabase's local/test auth configuration). Sign in as the first account, create a document, share it to the second account's registered email, then sign in as the second account to verify the shared view and assigned permission. Never commit demo passwords.

## Database authorization

- `documents` rows are visible to their owner and explicitly shared recipients.
- Owners and collaborators with `editor` permission can update title/content; only owners can delete or manage shares. Column-level SQL grants prevent changes to ownership and timestamps.
- `viewer` collaborators can read but cannot update, as enforced by PostgreSQL RLS.
- Sharing by email and collaborator listing are checked in security-definer RPCs. The app does not query `auth.users` directly.
- RLS helper functions live in the non-exposed `private` schema. Do not add it to Supabase's exposed schemas.
- The client uses only the public key. Do not configure or expose a service-role key in Vite/Vercel client variables.

## Tests and production build

```powershell
npm run test
npm run lint
npm run build
```

Unit/component tests do not require Supabase credentials. A live integration run requires a configured project, the schema, and test accounts; no cloud test result is implied by the unit test suite.

The last production-dependency audit (`npm audit --omit=dev`) reported no vulnerabilities. A full `npm audit` reports moderate advisories in the development-tool dependency tree (`minimatch`); npm reported no available automatic fix. Re-run the audit before release.

## Vercel deployment

1. Push the repository to your Git provider and import it in Vercel.
2. Keep the framework preset as **Vite**; the build command is `npm run build`, and the output directory is `dist`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Vercel project environment variables for the desired environments.
4. Deploy. [`vercel.json`](./vercel.json) rewrites SPA paths to `index.html`.
5. In Supabase Auth URL Configuration, set the deployed app URL as the Site URL and add it to the allowed redirect URLs.
6. Open the production URL and verify sign-in, document create/edit/reopen, import, sharing, and access revocation using two accounts.

The project is prepared for deployment, but it is not deployed or live-verified from this workspace.

## Known limitations

- No real-time co-editing, comments, version history, DOCX support, or offline/local persistence.
- Sharing targets a registered email only; collaborators must have created an account first.
- Markdown import preserves headings and basic ordered/unordered lists; inline Markdown syntax (for example emphasis and links) is imported as literal text.
- No custom password-reset UI or email invitation workflow is included; use Supabase Auth settings for email confirmation and recovery.
