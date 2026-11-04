# Ajaia Docs

A lightweight collaborative document editor built with React, TypeScript, Vite, Tailwind CSS, Tiptap, and Supabase. Users can create and edit rich-text documents, import `.txt` and `.md` files, export documents, and share them with existing registered users as editors or viewers.

## Live Application

**Deployed application:** https://ajaia-ai-native.vercel.app

**Source repository:** https://github.com/gracyvermaa/ajaia_ai_native

## Features

- Supabase email/password sign-up and sign-in.
- Document dashboard with owned, shared, recent, and searchable views.
- Rich-text editing: bold, italic, underline, headings, lists, undo, and redo.
- Debounced cloud autosave with explicit saving, saved, and failed states.
- Inline document renaming with validation.
- `.txt` and `.md` import with a 5 MB limit and basic Markdown structure conversion.
- Sharing with existing registered users using editor/viewer permissions.
- Collaborator listing and access revocation.
- PostgreSQL Row Level Security (RLS) for document and share access.
- PDF export through the browser's print functionality.
- Markdown export.
- Local-only presence indicator.
- Responsive interface and automated unit/component tests.
- Vercel single-page application deployment configuration.

Cloud functionality requires a configured Supabase project. When environment values are absent, the app displays a setup screen rather than implying that local or mock persistence is available.

## Technology

- React 18, TypeScript, Vite 6, Tailwind CSS 3
- Tiptap 2 and Lucide React
- Supabase Auth, PostgreSQL, and Row Level Security
- Vitest, jsdom, and React Testing Library

## Prerequisites

- Node.js 20.19+ or 22.12+
- npm
- A Supabase project for authentication, cloud persistence, and sharing

## Install and run locally

```powershell
npm install
Copy-Item .env.example .env.local
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`. Apply the database schema described below, then run:

```powershell
npm run dev
```

Vite prints the local development URL, normally `http://localhost:5173`.

Never put a Supabase service-role key in frontend code or client-side environment variables.

## Supabase setup

1. Create a project at [Supabase](https://supabase.com/).
2. In **Project Settings → API**, copy the Project URL and public anon/publishable key into `.env.local`.
3. Open **SQL Editor**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it.
4. In **Authentication → Providers**, enable Email and configure email confirmation for your environment.
5. Keep the `private` schema out of Supabase's exposed schemas.
6. Restart Vite after changing environment values.
7. Create accounts through the application or Supabase Auth. Profile rows are maintained by a database trigger; sharing grants access to an existing registered account.

### Environment variables

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon/publishable key |

`.env*` files are ignored by Git; `.env.example` is safe to commit. Use the same variable names in Vercel project settings.

## Database authorization

- Document rows are visible to their owner and explicitly shared recipients.
- Owners and collaborators with `editor` permission can update document titles and content.
- Only owners can delete documents or manage shares.
- `viewer` collaborators can read but cannot update documents.
- Sharing by email and collaborator listing use permission-checked RPCs.
- RLS helper functions live in the non-exposed `private` schema.
- The client uses only the public key. Never expose a service-role key in Vite or Vercel client variables.

PostgreSQL RLS is the authoritative security boundary; client-side permission checks only control the user experience.

## Tests and production build

Run the following commands:

```powershell
npm run test
npm run lint
npm run build
```

**Latest reported verification:**

- Automated tests: 42 passed.
- ESLint: passed.
- Production build: passed.
- `git diff --check`: passed.
- Manual checks included authentication, document editing and persistence, export functionality, and sharing with two separate accounts.

Unit/component tests do not require Supabase credentials. Cloud integration behavior was separately checked using a configured project and test accounts.

## Vercel deployment

The application is deployed on Vercel:

https://ajaia-ai-native.vercel.app

The deployment uses Vite with `npm run build` and `dist` as the output directory. Supabase public environment variables are configured through Vercel project settings. The [`vercel.json`](./vercel.json) configuration handles SPA routing.

The deployed application was manually checked for its core document and sharing workflows.

## Known limitations

- Cross-user synchronized real-time co-editing and presence are not implemented. The current presence indicator is local-only.
- Comments and version history are not implemented.
- DOCX import is not supported.
- Markdown import supports basic headings and ordered/unordered lists; unsupported inline syntax is retained as plain text.
- Sharing is limited to existing registered users; no separate email invitation workflow is included.
- PDF export uses browser print functionality.
- Offline/local persistence is not provided.

## Future Improvements

Potential extensions include synchronized real-time collaboration, comments, version history, richer Markdown parsing, and document deep-link routing.

