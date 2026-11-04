# Ajaia Docs — Assignment Submission

## 1. Project Overview

**Project:** Ajaia Docs  
**Assignment:** AI-Native Full Stack Developer Assignment  
**Application:** https://ajaia-ai-native.vercel.app  
**Source Code:** https://github.com/gracyvermaa/ajaia_ai_native

Ajaia Docs is a lightweight collaborative document editor inspired by Google Docs. It enables authenticated users to create, edit, format, save, import, export, and share documents with other registered users.

The application focuses on delivering a usable document-management and editing experience within the assignment's time constraints, with particular attention to persistence, access control, and practical product decisions.

## 2. Live Application

**Deployed URL:**  
https://ajaia-ai-native.vercel.app

The application is deployed using Vercel, with Supabase providing authentication, PostgreSQL persistence, and access control.

## 3. Source Code

**GitHub Repository:**  
https://github.com/gracyvermaa/ajaia_ai_native

The repository contains the application source code, Supabase schema, tests, documentation, and configuration required for local development and deployment.

## 4. Implemented Features

### 4.1 Authentication

- Email and password registration.
- User login and logout.
- Authentication session restoration.
- User-specific document access.

### 4.2 Document Creation and Editing

- Create new documents.
- Edit document titles inline.
- Edit document content in the browser.
- Save and reopen existing documents.
- Debounced autosave.
- Save-state feedback, including saving, saved, and failed states.
- Document validation and error handling.

### 4.3 Rich-Text Editing

The editor uses Tiptap and supports:

- Bold.
- Italic.
- Underline.
- Headings.
- Bulleted lists.
- Numbered lists.
- Undo and redo.

Document structure and formatting are stored in JSON format and persisted in Supabase.

### 4.4 File Import

Users can import supported files into the document workflow.

Supported formats:

- `.txt`
- `.md`

Imported content becomes editable document content.

The application communicates supported file types and enforces a 5 MB file-size limit.

### 4.5 Document Sharing

Users can share documents with other registered users through their email addresses.

Implemented sharing capabilities:

- Document owner identification.
- Grant access to another registered user.
- Editor permission.
- Viewer permission.
- Visible distinction between owned and shared documents.
- Shared document access.
- Collaborator management.
- Access revocation.
- Validation and error handling for sharing operations.

Sharing authorization is enforced through Supabase database policies and application logic.

### 4.6 Persistence and Authorization

The application uses Supabase PostgreSQL for persistent document and sharing data.

Implemented capabilities include:

- Persistent document records.
- JSON-based document content storage.
- Document ownership.
- Document-sharing records.
- Updated timestamps.
- Row Level Security (RLS).
- Owner and editor update permissions.
- Viewer read-only access.
- Access restrictions for unauthorized users.

Documents remain available after refreshing or reopening the application.

## 5. Additional Enhancements

Beyond the core assignment requirements, the following enhancements were implemented.

### 5.1 Inline Document Renaming

Users with appropriate permissions can click the document title to rename it directly in the editor.

The implementation includes:

- Inline title editing.
- Enter-to-save behavior.
- Escape-to-cancel behavior.
- Validation for empty titles.
- Saving feedback.
- Persistence of the updated title.

### 5.2 PDF Export

Users can export documents to PDF through the browser's print functionality.

The print layout is designed to exclude application controls and present the document content in a clean printable format.

### 5.3 Markdown Export

Users can download document content as a Markdown (`.md`) file.

The export supports:

- Document titles.
- Headings.
- Paragraphs.
- Bold and italic formatting.
- Underline represented using HTML underline markup.
- Ordered lists.
- Bulleted lists.

### 5.4 Real-Time Contributor Presence — Partially Implemented

The document editor includes a contributor presence indicator that currently displays the local session, for example:

`1 local session · You`

The local presence indicator and its interface are implemented.

Multiple registered users can access the same shared document through the sharing functionality. However, synchronized cross-user presence through Supabase Realtime is not yet implemented.

As a result, the application does not currently display a synchronized live count or identities of all active contributors across different browser sessions.

**Future enhancement:** Integrate Supabase Realtime Presence using document-specific channels to track authenticated collaborators joining and leaving a document.

## 6. Technology Stack

| Area | Technology |
|---|---|
| Frontend | React |
| Language | TypeScript |
| Build tool | Vite |
| Rich-text editor | Tiptap |
| Backend and database | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Authorization | PostgreSQL Row Level Security |
| Icons | Lucide React |
| Testing | Vitest and React Testing Library |
| Deployment | Vercel |
| Version control | Git and GitHub |
| AI development tools | ChatGPT and GitHub Copilot |

## 7. Architecture and Engineering Decisions

The application follows a frontend-plus-managed-backend architecture.

- React provides the user interface and document workflows.
- Tiptap manages structured rich-text editing.
- Supabase Auth handles user authentication.
- Supabase PostgreSQL stores documents and sharing records.
- Row Level Security enforces data access restrictions.
- Vercel hosts the deployed frontend.

### Key Engineering Decisions

**Structured content storage:**  
Document content is stored as JSON rather than plain text to preserve rich-text structure and formatting.

**Debounced autosave:**  
Autosave reduces unnecessary database updates while ensuring that document changes are persisted.

**Database-level authorization:**  
RLS policies enforce document access permissions instead of relying only on frontend visibility.

**Managed infrastructure:**  
Supabase and Vercel were selected to keep deployment and infrastructure manageable within the assignment timebox.

## 8. Automated Testing and Verification

The implementation was verified through automated tests and development checks.

Latest reported verification results:

| Verification | Result |
|---|---|
| Automated test suite | 42 tests passed |
| `npm run lint` | Passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |

### Manual Verification

The following workflows were manually checked:

- Application deployment and access.
- Authentication and dashboard access.
- Document creation and editing.
- Document save and reopen behavior.
- Rich-text formatting.
- Document title renaming.
- TXT and Markdown import.
- Document sharing between two registered accounts.
- Editor access to a shared document.
- PDF export.
- Markdown export.

Two separate registered accounts were used to verify access to the same shared document.

The presence indicator remains local-only, as described in Section 5.4.

## 9. AI-Native Development Workflow

AI tools were used as development assistants throughout the project.

### Tools Used

- ChatGPT.
- GitHub Copilot Agent.

### Where AI Helped

AI tools assisted with:

- Breaking down the assignment into manageable implementation tasks.
- Planning the application architecture.
- Generating and refining React components.
- Debugging frontend and backend integration issues.
- Investigating Supabase authentication and RLS behavior.
- Improving document-sharing workflows.
- Creating automated tests.
- Reviewing implementation decisions.
- Preparing technical documentation.

### Human Review and Decisions

AI-generated output was reviewed and tested rather than accepted without verification.

Examples of engineering decisions included:

- Preserving database-level authorization instead of weakening RLS to resolve access issues.
- Correcting rich-text formatting behavior when list markers and italic styling did not render as expected.
- Using a serialized save queue to protect document updates during title changes and content autosave.
- Keeping contributor presence explicitly local-only rather than claiming real-time collaboration without cross-session synchronization.
- Prioritizing stable core functionality over complex optional collaboration features.

### Verification Approach

Generated implementation changes were checked using automated tests, linting, production builds, code review, and manual browser testing.

AI accelerated development, while implementation scope, technical tradeoffs, and verification decisions remained deliberate.

## 10. Known Limitations and Incomplete Features

The application intentionally prioritizes core document workflows over reproducing the full functionality of Google Docs.

Current limitations:

1. Real-time contributor presence is partially implemented. The local indicator exists, but cross-user synchronization through Supabase Realtime is incomplete.
2. Simultaneous conflict-free collaborative editing is not implemented.
3. Comments and suggestion mode are not implemented.
4. Document version history is not implemented.
5. File import is limited to TXT and Markdown formats.
6. PDF export uses browser print functionality rather than a dedicated server-side PDF generation service.

These limitations are acknowledged rather than represented as completed functionality.

## 11. What I Would Build Next With Another 2–4 Hours

If given additional development time, I would prioritize:

1. **Supabase Realtime Presence:** Track authenticated collaborators in document-specific channels and display synchronized contributor identities.
2. **Collaborative editing:** Introduce a suitable collaboration mechanism to support simultaneous editing and conflict handling.
3. **Document version history:** Store and restore previous document versions.
4. **Comments:** Allow collaborators to leave contextual feedback on document content.
5. **Expanded file support:** Evaluate DOCX import and additional export options.

These improvements would build on the existing authentication, persistence, and sharing foundation.

## 12. Local Setup Instructions

### Prerequisites

- Node.js and npm.
- A Supabase project.
- Git.

### Clone the Repository

```bash
git clone https://github.com/gracyvermaa/ajaia_ai_native.git
cd ajaia_ai_native
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Use your own Supabase project values. Do not expose service-role credentials in frontend environment variables.

### Configure Supabase

Apply the database schema and migrations provided in the repository's `supabase` directory to your Supabase project.

Ensure email authentication is configured in Supabase Auth.

### Run Locally

```bash
npm run dev
```

### Run Automated Tests

```bash
npm run test
```

### Run Lint

```bash
npm run lint
```

### Create Production Build

```bash
npm run build
```

## 13. Reviewer Access and Test Accounts

The application requires registration or login.

Reviewers can register using their own email address and test document creation and editing.

To verify sharing:

1. Register or sign in using two separate accounts.
2. Create a document using the owner account.
3. Share the document with the second registered account.
4. Sign in using the second account.
5. Open the shared document and verify the assigned permission.

No passwords or private credentials are included in this submission document.

## 14. Submission Materials

**GitHub Source Repository:**  
https://github.com/gracyvermaa/ajaia_ai_native

**Live Application:**  
https://ajaia-ai-native.vercel.app

**Google Drive Submission Folder:**  
https://drive.google.com/file/d/1Vw41uDfUTEgP2Z5D6cN_aqKx0xdZ9q2R/view?usp=sharing

The Google Drive folder should contain:

- Source code.
- `README.md`.
- `ARCHITECTURE.md`.
- `AI_WORKFLOW.md`.
- `SUBMISSION.md`.
- `WALKTHROUGH_VIDEO.txt`.
- Supporting screenshots or demo material, if applicable.

## 15. Walkthrough Video

**Video platform:** Loom

**Video URL:**  
https://www.loom.com/share/4db09485336f47109940db1ef8befbfd

The walkthrough will demonstrate:

- Main application flow.
- Authentication.
- Document creation and editing.
- Rich-text formatting.
- Autosave and persistence.
- File import.
- Document sharing and permissions.
- PDF and Markdown export.
- Implemented enhancements.
- Deliberately deprioritized features.
- Architecture and AI-assisted development decisions.

---

## Final Note

Ajaia Docs was developed as a focused product slice within the assignment's time constraints.

The implementation prioritizes a working document editor, persistent storage, authenticated access, sharing permissions, and a deployed application that reviewers can test.

Optional features were approached deliberately, with known limitations documented transparently rather than sacrificing the reliability of the core experience.

**Thank you for reviewing my submission.**