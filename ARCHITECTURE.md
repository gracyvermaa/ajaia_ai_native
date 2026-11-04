# Architecture

## 1. Overview

Ajaia Docs is a single-page React application deployed as static assets. Supabase provides authentication, PostgreSQL persistence, authorization, and document-sharing RPCs.

The browser uses only the Supabase public anon/publishable key. Database access is protected by PostgreSQL Row Level Security (RLS), which remains the authoritative authorization layer.

## 2. Frontend Structure

The frontend is organized into application, component, and data-access modules.

| File | Responsibility |
|---|---|
| `src/App.tsx` | Authentication session lifecycle, dashboard/editor selection, and document loading |
| `src/components/AuthForm.tsx` | Email/password sign-up and sign-in |
| `src/components/Dashboard.tsx` | Owned/shared/recent filters, search, import, document creation, and deletion |
| `src/components/DocumentCard.tsx` | Document summary, owner/collaborator label, and delete affordance |
| `src/components/EditorPage.tsx` | Title changes, permission resolution, autosave queue, and share-dialog lifecycle |
| `src/components/RichTextEditor.tsx` | Tiptap-based rich-text editing |
| `src/components/FormattingToolbar.tsx` | Formatting actions |
| `src/components/ShareDialog.tsx` | Invite existing users, list collaborators, and revoke access |
| `src/lib/documents.ts` | Typed Supabase data-access functions |
| `src/lib/documentUtils.ts` | Title/file validation, import conversion, and permission helpers |

The application intentionally has no local or mock persistence fallback. If either required Supabase public environment variable is missing, a setup screen explains the configuration requirement.

## 3. Backend and Data Schema

The database schema is defined in `supabase/schema.sql`.

### Main tables

- **`user_profiles`**: Stores a minimal account identity projection containing `id` and email. A trigger synchronizes profile records from `auth.users`. RLS restricts profile visibility to the user's own profile.
- **`documents`**: Stores document title, Tiptap JSON content (`content_json`), owner identity, and timestamps.
- **`document_shares`**: Stores document-sharing relationships, with one recipient per document and either `editor` or `viewer` permission.

### Constraints and indexes

- Foreign keys support cascading account and document deletion.
- Constraints validate title length and permitted share roles.
- An `(owner_id, updated_at)` index supports owned/recent document queries.
- A recipient/document index supports shared-document lookup.
- A unique document/recipient pair prevents duplicate shares.
- A trigger maintains `updated_at`.

## 4. Authentication and Authorization

Supabase Auth manages user authentication and browser sessions.

Document access follows these rules:

- Owners and shared users can read documents.
- Owners and editors can update document titles and content.
- Only owners can delete documents or manage collaborators.
- Share insertion is performed through the `share_document_with_email` RPC.
- `get_document_people` restricts collaborator metadata to members of the relevant document.

Table privileges are explicitly revoked from `PUBLIC`, `anon`, and `authenticated` before the required operations are granted. Authenticated inserts are restricted to the permitted document columns, while updates are limited to title and content. This prevents collaborators from changing ownership or timestamps through those operations.

The sharing RPC checks the authenticated owner, recipient account, and requested permission before upserting access.

### RLS helper functions

Small `SECURITY DEFINER` helper functions in the non-PostgREST-exposed `private` schema support RLS policies and avoid recursive policy evaluation across documents and shares.

These functions use a fixed search path and are executable only by authenticated users. The `private` schema must remain outside Supabase's exposed schemas.

Client-side permission checks improve the interface, but PostgreSQL RLS remains the security boundary.

## 5. Data Flow

1. The application reads the current Supabase authentication state. Unauthenticated users see the authentication form.
2. The dashboard retrieves owned and shared documents through RLS-filtered queries.
3. Document creation and import insert records with `owner_id` set to the current authenticated identity.
4. The editor loads `content_json` into Tiptap. Changes are emitted as JSON.
5. Title and content changes are debounced for 800 ms and sent through a serialized update queue.
6. The editor displays save status and retains the latest content if saving fails.
7. Returning to the dashboard flushes pending edits before navigation.
8. Sharing and revocation use permission-checked database operations.

## 6. Autosave and Resilience

The editor maintains the latest title and JSON content in refs for queued save operations.

The autosave implementation includes:

- An 800 ms debounce to avoid unnecessary database writes.
- A serialized update queue to preserve write order.
- Title validation before saving.
- A save-generation counter to prevent an older request from displaying a misleading `Saved` state after a newer edit.
- Explicit flushing of pending changes when navigating away from the editor.
- Error handling that keeps the user in the editor if navigation-triggered saving fails.

These safeguards help prevent stale save indicators and reduce the risk of losing unsaved changes.

## 7. Import

The import workflow supports `.txt` and `.md` files up to 5 MB.

The process validates the file extension and size before reading its contents.

- Plain-text lines are converted into paragraph nodes.
- Markdown headings are converted into corresponding Tiptap heading nodes.
- Simple ordered and unordered lists are converted into Tiptap list nodes.
- Unsupported inline Markdown syntax is retained as plain text rather than being represented as fully parsed formatting.

DOCX import and complete Markdown parsing are not supported.

## 8. Deployment and Tradeoffs

Vite builds the application into static files in the `dist` directory. Vercel serves the application and rewrites app requests to the SPA entry point.

Supabase configuration is supplied through Vite public environment variables. No custom application API server is required because database authorization is handled through SQL policies and narrowly scoped RPCs.

The implementation prioritizes a functional document-editing workflow, persistent storage, and access control over additional collaboration features.

### Deliberate scope limitations

- Cross-user synchronized real-time presence and co-editing are not implemented. The presence indicator is local-only.
- Document deep-link routing is not implemented.
- Comments and version history are outside the current scope.
- Import is limited to TXT and Markdown files, with basic Markdown conversion rather than full parsing.

These tradeoffs kept the implementation focused on the assignment's core requirements.