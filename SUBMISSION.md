# Submission

## Deliverables

- React/Vite/TypeScript Ajaia Docs application.
- Supabase schema, RLS authorization, account profile synchronization, and sharing RPCs.
- Responsive dashboard, authentication form, Tiptap editor, autosave, `.txt`/`.md` import, and share management.
- Vitest and React Testing Library tests.
- README, architecture, AI workflow, Vercel configuration, and this submission summary.

## Implemented

- Email/password sign-up and login.
- Owned, shared, and recent document navigation and search.
- Create, open, rename, autosave, reload, and owner delete flows.
- Rich text headings, paragraph, bold, italic, underline, lists, undo, redo.
- Text/Markdown import, basic structure conversion, file type and size validation.
- Existing-user share grant/revoke with editor or viewer permissions.
- Owner/editor/viewer authorization enforced in PostgreSQL RLS.
- Responsive layouts and explicit loading/error/save states.

## Partially implemented / limitations

- No real-time co-editing, comments, version history, DOCX, offline editing, or invite-email sending.
- No document-specific URL/deep-link routing.
- Markdown import handles headings and simple lists; inline Markdown markup remains plain text.
- Supabase project configuration and live service verification have not been performed in this workspace.

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Apply [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor and enable Email Auth.
4. Run `npm run dev`.
5. Use two registered accounts to validate sharing behavior.

See [`README.md`](./README.md) for detailed Supabase and Vercel setup.

## Deployment

Live deployment URL: **Not deployed.** Add the public Supabase variables to Vercel, deploy the Vite app, add the production URL to Supabase Auth allowed URLs, then verify the live flows.

## Test results

- `npm run test`: passed — 2 test files, 6 tests.
- `npm run lint`: passed.
- `npm run build`: passed — strict TypeScript check and Vite production build.
- `npm audit --omit=dev`: 0 production dependency vulnerabilities.
- `npm audit`: reports 12 moderate development-tool advisories through `minimatch` (npm reported no available fix); no production dependency advisory was reported.

## Demo account

No demo credentials are included. Create two accounts with email addresses you control; share a document from one to the other. Avoid storing credentials in Git.

## Next 2–4 hours

- Apply the schema to a hosted Supabase project and run two-account end-to-end testing.
- Add document route/deep-link support and keyboard accessibility review.
- Add browser-level import, autosave failure, and share/revocation tests.
- Improve Markdown inline parsing and support email invitation/recovery UX.
- Verify Vercel deployment and document the live URL after production smoke tests.
