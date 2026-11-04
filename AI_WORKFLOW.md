# AI workflow

## Tools used

The implementation was developed with an AI coding assistant in VS Code. It was used to inspect the starter workspace, scaffold React/Vite/TypeScript files, draft interface and data-access code, author the SQL schema and documentation, and help interpret build/test/lint feedback.

## Examples of AI-assisted output

- React components for the auth screen, workspace dashboard, editor toolbar, and share dialog.
- A typed Supabase data-access module and PostgreSQL DDL/RLS policies.
- Unit tests for document validation, import conversion, permissions, and editor rendering.
- Setup, architecture, testing, and deployment documentation.

## Engineering decisions and review

- Supabase was selected as the sole persistence/auth path rather than adding a successful-looking local mock. Missing environment configuration is shown explicitly.
- Share-by-email is implemented as an RPC against a trigger-maintained profile projection because browser code cannot safely enumerate `auth.users`.
- Database RLS remains authoritative for read/edit/delete/share access; client permission checks only control the experience.
- Document content is stored as Tiptap JSON so formatting survives reload.
- Import scope is explicit: `.txt` and `.md` only, bounded by file size; no unsupported DOCX promise.
- Real-time co-editing, comments, and history were rejected for this timeboxed core assignment.

## Correctness verification

Automated tests cover pure validation/conversion/permission logic and the editor rendering contract. TypeScript production build and ESLint are used to detect integration/type issues. SQL policy behavior and actual cloud persistence still require applying `supabase/schema.sql` to a Supabase project and manually testing with two accounts; no external service result is claimed unless performed.

## AI-generated suggestions changed or rejected

- Any implication that a locally running UI automatically means cloud persistence is working was rejected; the app gates on explicit Supabase configuration.
- A generic “copy link” button was omitted because the editor does not implement document deep-link routing; copying the dashboard URL would be misleading.
- A service-role key in client code was rejected. Only the public anon key belongs in frontend configuration.

## Debugging process

The project uses focused Vitest/Testing Library tests, TypeScript’s strict project build, and ESLint. Failures are to be corrected and rerun before reporting results. Supabase integration must be validated separately with real project settings and accounts.
