# Architecture

## Overview

Ajaia Docs is a single-page React application hosted as static assets. Supabase provides identity, PostgreSQL storage, authorization, and share-management RPCs. The browser only receives the Supabase public anon key; authorization is enforced again by PostgreSQL RLS.

## Frontend structure

- `src/App.tsx`: auth session lifecycle, dashboard/editor selection, and document loading.
- `src/components/AuthForm.tsx`: email/password sign-up and sign-in.
- `src/components/Dashboard.tsx`: owned/shared/recent filters, search, import, create, and delete.
- `src/components/DocumentCard.tsx`: document summary, owner/collaborator label, and delete affordance.
- `src/components/EditorPage.tsx`: title changes, permission resolution, autosave queue, and share dialog lifecycle.
- `src/components/RichTextEditor.tsx` and `FormattingToolbar.tsx`: Tiptap JSON editor and format actions.
- `src/components/ShareDialog.tsx`: invite existing users, list collaborators, and revoke access.
- `src/lib/documents.ts`: typed Supabase data access.
- `src/lib/documentUtils.ts`: title/file validation, import conversion, and permission helper.

The app intentionally does not provide a local/mock persistence fallback. Without both Supabase public environment values, a setup screen explains the missing configuration.

## Backend and data schema

`supabase/schema.sql` defines:

- `user_profiles`: minimum account identity projection (`id`, email), synchronized from `auth.users` by a trigger. The table itself only exposes a user's own profile through RLS.
- `documents`: document title, Tiptap JSON (`content_json`), owner, and timestamps.
- `document_shares`: one recipient per document, with `editor` or `viewer` permission.

Foreign keys cascade account/document deletion. Constraints validate title length and permission values. An `(owner_id, updated_at)` index supports owned/recent listing; a recipient/document index supports share lookup; a unique pair constraint prevents duplicate shares. `updated_at` is maintained by a trigger.

## Authentication and authorization

Supabase Auth issues the browser session. Document reads are allowed to owners and shared users. Owners and editors may update document title/content; only owners may delete or change collaborators. Table privileges are explicitly revoked from `PUBLIC`, `anon`, and `authenticated` before granting the required operations. Authenticated inserts are limited to title/content/owner columns, and updates are limited to title/content so a collaborator cannot change `owner_id` or timestamps. Share insertion goes through `share_document_with_email`, which checks the authenticated owner, recipient account, and requested permission before upserting access. `get_document_people` limits collaborator metadata to document members.

Small `SECURITY DEFINER` helper functions in the non-PostgREST-exposed `private` schema are used by RLS policies to avoid recursive policy evaluation across documents and shares. They use a fixed search path and are executable only by authenticated users. Keep `private` out of Supabase's exposed schemas. Application permission checks improve the UI, but are not the security boundary.

## Data flow

1. Auth state is read from Supabase; unauthenticated users see the auth form.
2. Dashboard reads the user's owned and shared document sets via RLS-filtered queries.
3. Create/import inserts a document with `owner_id` set to the current identity. The database validates ownership and title.
4. The editor loads `content_json` into Tiptap, which emits JSON on changes.
5. Title/content changes are debounced by 800 ms and sent through a serialized update queue. The editor exposes save state and retains data on failure. Returning to the dashboard flushes pending edits before navigation.
6. Sharing uses a permission-checked RPC. Revocation uses an owner-only RLS delete policy.

## Autosave and resilience

The editor holds the latest title and JSON in refs for queued work, validates the title before saving, and increments a save generation to avoid an older completion displaying a false “Saved” state after a newer edit. Updates are serialized to preserve write order. A navigation attempt explicitly saves dirty content and stays in the editor on failure.

## Import

The import path validates `.txt`/`.md` extension and a 5 MB maximum before reading. Plain lines become paragraphs; Markdown headings and simple ordered/unordered lists become corresponding Tiptap JSON nodes. Unsupported inline syntax is retained as plain text, not misrepresented as fully parsed Markdown.

## Deployment and tradeoffs

Vite emits static files to `dist`. Vercel rewrites app requests to the SPA entry point. Supabase configuration is injected as Vite public environment variables. The app avoids a custom API server because the required authorization is expressed in SQL policies and narrowly scoped RPCs. Real-time presence/collaboration, a document URL router, and rich Markdown parsing are intentionally out of scope.
