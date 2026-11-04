# AI Workflow

## Tools Used

The application was developed with the assistance of AI coding tools in VS Code. AI was used to inspect the starter workspace, scaffold React/Vite/TypeScript files, draft interface and data-access code, author the SQL schema, generate tests, and help interpret build, test, and lint feedback.

## Examples of AI-Assisted Output

- React components for the authentication screen, workspace dashboard, editor toolbar, and sharing dialog.
- A typed Supabase data-access module and PostgreSQL DDL/RLS policies.
- Unit tests for document validation, import conversion, permissions, and editor rendering.
- Setup, architecture, testing, and deployment documentation.

## Engineering Decisions and Review

- Supabase was selected as the persistence and authentication path rather than relying on a local mock. Missing environment configuration is surfaced explicitly.
- Share-by-email uses an RPC backed by a trigger-maintained profile projection because browser code cannot safely enumerate `auth.users`.
- Database Row Level Security (RLS) remains authoritative for read, edit, delete, and sharing access. Client-side permission checks control the user experience but do not replace database security.
- Document content is stored as Tiptap JSON so rich-text formatting is preserved when documents are reopened.
- Import support is explicitly limited to `.txt` and `.md` files, with a file-size limit. DOCX import is not supported.
- Real-time co-editing, comments, and version history were kept outside the core assignment scope. A local-only presence indicator was implemented, but cross-user synchronized presence is not available.

## Correctness Verification

The project was verified using automated tests, linting, production builds, and manual application checks.

- **Automated tests:** 42 tests passed.
- **ESLint:** Passed.
- **Production build:** Passed.
- **Git diff validation:** `git diff --check` passed.
- **Manual checks:** Authentication, document editing and persistence, export functionality, and sharing permissions were tested. Sharing was also checked using two separate user accounts.

These checks provide evidence of the tested application behavior. They should not be interpreted as proof of untested scenarios or exhaustive production security testing.

## AI-Generated Suggestions Changed or Rejected

- Any implication that a locally running UI automatically means cloud persistence is working was rejected. The app requires explicit Supabase configuration.
- A generic “copy link” button was omitted because the editor does not implement document deep-link routing; copying the dashboard URL would be misleading.
- A service-role key in client-side code was rejected. Only the public anon/publishable key belongs in frontend configuration.
- Full real-time collaboration was not claimed because synchronized Supabase Realtime Presence was not implemented.

## Debugging Process

Development used focused Vitest and Testing Library tests, TypeScript production builds, and ESLint checks. Failures were investigated and corrected before the final verification run. Supabase integration and sharing behavior were also checked separately using configured project credentials and two user accounts.