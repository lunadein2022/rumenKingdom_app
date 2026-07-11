# Princess OS implementation audit

## Addressed in this refactor

- Removed the calendar's fixed June 2026 date assumptions.
- Implemented real month navigation and month/week/day/list filtering.
- Added recurring-event metadata, important filters, keyboard selection, Escape-to-close, and dynamic empty states.
- Persisted guest events, quests, projects, diary entries, and Rita conversation history locally.
- Added project create, edit, progress update, and delete flows.
- Added calendar event detail editing with optimistic Supabase updates and rollback on failure.
- Added visible save, update, move, delete, and load status feedback for calendar synchronization.
- Added working global search, notification summary, library filtering, and date-based diary controls.
- Protected the Claude Netlify Function with Supabase access-token verification.
- Added password reset and OAuth error feedback.
- Added missing Supabase tables and RLS policies for relationships, tags, folders, attachments, and notifications.
- Split calendar, header, navigation, login, and Rita-state UI into dedicated modules.
- Added ESLint, reduced-motion support, clearer focus states, and more readable UI text.

## Remaining product work

### High priority

- Project, quest, diary, relationship, folder, attachment, and notification screens still need Supabase repositories and server synchronization. Calendar is currently the only synchronized domain.
- Rita can converse securely but does not yet execute confirmed CRUD actions. Add a typed action plan, user confirmation, transaction execution, and audit log.
- Recurrence rules are stored but recurring instances are not expanded. Use a tested RRULE implementation or server-side occurrence generator.
- Add one-click retry for failed calendar synchronization and extend the same loading/error/rollback pattern to every remaining Supabase domain.
- Add automated tests for auth, RLS, calendar date boundaries, guest persistence, and Claude authorization.

### Medium priority

- Build the Relationships UI and complete the Library's folders, tags, favorites, sorting, and cross-domain full-text search.
- Implement attachment upload through Supabase Storage with file-size and MIME validation.
- Persist AI conversations in `ai_conversations` for signed-in users.
- Implement the 06:00 Asia/Seoul daily briefing as a scheduled server job; it must be idempotent and must not delete historical data.
- Replace placeholder notification counts with the `notifications` table and browser permission flow.
- Add diary Supabase synchronization and enforce the specified editing window on the server, not only in the UI.

### Architecture alignment

- The current UI uses custom CSS rather than the originally requested Tailwind/shadcn system.
- FullCalendar and Recharts are not yet integrated; the current calendar and progress bars are custom implementations.
- Before adding many more pages, split `App.tsx` further into Office, Library, Diary, Garden, Rita, and Throne feature modules.

## Deployment prerequisites

- Apply `supabase/schema.sql` to a new or reviewed Supabase project.
- Configure both browser and server Supabase environment variables listed in `.env.example`.
- Configure `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` only in Netlify server environment variables.
- Confirm Google OAuth redirect URLs for local, Netlify preview, and production domains.
- Run `pnpm lint`, `pnpm build`, and RLS integration tests before production deployment.

## 2026-07 routed structure and library expansion

- Replaced Zustand `setPage()` navigation with React Router URLs for every top-level page.
- Added project, completed-project, library category, archive item, relationship, memorandum, diary-date, and calendar-event detail routes.
- Added safe detail back navigation with parent fallbacks, browser back/forward support, reload-safe URLs, a 404 state, and Netlify SPA fallback verification.
- Split lobby, office, library, diary, garden, Rita, throne, and calendar detail views into feature modules.
- Kept the existing visual language while adding shared page headings, royal dividers, back buttons, empty states, and a reusable modal shell.
- Expanded project and quest models with IDs, types, status, priority, dates, favorites, completion timestamps, and persisted-state migration.
- Project progress is now derived from linked daily/sub quests; manual progress is only editable when no quests are linked.
- Completed projects are hidden from the active office list and available at `/office/completed`.
- Added a data-derived Royal Library with categories for all records, main quests, daily quests, sub quests, relationships, memoranda, and diaries.
- Added keyword search, tag/favorite filtering, sorting, detail navigation, favorites, editing, and deletion to archive lists.
- Added local relationship and memorandum CRUD with dedicated detail pages.
- Added Rita's explicit “메모해줘” draft flow: Rita prepares a memorandum draft and the user must review and confirm before local storage.
- Added the seven supplied book-cover assets under `public/assets/books`, including a small display crop to conceal source-edge pixel artifacts.
- Added full-page calendar-event and date-specific diary routes without removing the existing quick calendar modal.

### Intentionally deferred after this structure phase

- Supabase repositories for projects, daily/sub quests, diaries, relationships, memoranda, tags, and favorites.
- Business-card upload, Storage policies, OCR, and Rita-assisted relationship extraction.
- General-purpose Claude structured actions beyond the explicit confirmed memorandum draft flow.
- Recurrence occurrence generation, calendar retry queue, scheduled 06:00 briefing, browser notifications, and attachment handling.

## 2026-07 Rita attachment workflow

- Activated Rita's attachment button with previews, validation, progress, cancellation, and accessible status feedback.
- Image attachments are treated as business cards, analyzed by Claude vision, and opened as editable Relationship drafts before confirmation.
- PDF, DOCX, TXT, MD, and CSV attachments are extracted or analyzed by Claude and opened as editable Memorandum drafts.
- Audio attachments are transcribed through the server-only transcription provider, summarized by Claude, and retain the full transcript in the Memorandum.
- Original attachment metadata, OCR text, transcripts, and private Storage paths are retained on the local domain models.
- Added the private `rita-attachments` Supabase Storage bucket definition with per-user folder RLS policies and a 4 MB/type allowlist.
- No AI attachment result performs automatic CRUD. Relationship and Memorandum records are written only after the user reviews and confirms the draft.

### Deployment requirements for attachments

- Reapply or review `supabase/schema.sql` to create the private `rita-attachments` bucket and policies.
- Configure `OPENAI_API_KEY` in Netlify to enable uploaded-audio transcription; it is never exposed to the browser.
- Claude and Supabase server/browser environment variables remain required. Guest mode can preview the UI, but protected analysis requires a real Supabase session.
- The direct function payload is intentionally capped at 4 MB. Larger-file resumable Storage processing remains a later scalability enhancement.

## 2026-07 Office project and quest simplification

- Reframed a main quest as an optional link target rather than a required parent of daily and sub quests.
- Rebuilt the Office as a desktop split command center: compact main quests on the left and all quests on the right.
- Added real summary metrics for active main quests, open tasks scheduled today, completed quests, and waiting quests.
- Added quest creation and editing with daily/sub type, optional main-quest link (`none` creates an independent quest), scheduled date/time, and priority.
- Added quest search and filters for all, linked, independent, today, and this week.
- Every quest row now identifies its linked main quest or explicitly displays `독립 퀘스트`.
- Removed the manual progress control. Main-quest progress is always derived from completed linked quests and is 0% when no quest is linked.
- Expanded main-quest detail with separate daily/sub lists, quest editing, new linked quest creation, and connecting an existing independent quest.
- Deleting a main quest preserves its quests by converting them to independent quests.
- Replaced the shared header logo with the supplied romance-fantasy WebP asset.

## 2026-07 Palace lobby, garden, and drag linking

- Rebuilt the Lobby as the palace entrance while preserving the shared Header, Footer, main padding, and maximum content width.
- Added a lobby-only Hero with the large princess figure, Rita's briefing, five compact daily indicators, and focused navigation to Office, Calendar, and Rita.
- Kept only the top five quests and top three active main quests below the Hero so the Lobby remains a destination hub rather than another Office dashboard.
- Added a short Rita message at the bottom without introducing a second chat interface.
- Removed the common page heading and large white content card from the Secret Garden; the garden background now fills the shared body area and the resting message sits near the pavilion/fountain area.
- Added desktop drag-and-drop from the Office quest list onto a main quest, with a highlighted drop target, automatic progress recalculation, a success toast, and a drop zone for returning a quest to independent status.
- Preserved the quest edit modal as the mobile and keyboard-accessible alternative to drag-and-drop.
- Replaced the Header wordmark with the supplied `루멘왕국_공주의하루_헤더로고_v3.webp` asset.

## 2026-07 usability and record-detail refinement

- Restored every desktop Header navigation label and reserved enough width for the supplied wordmark to render at its natural aspect ratio without cropping or horizontal compression.
- Returned the Royal Library landing covers to a compact, single-row desktop shelf while retaining a responsive two-column mobile layout.
- Lowered and reduced the Secret Garden resting message so it belongs to the garden scene instead of competing with the fountain and pavilion.
- Expanded local main-quest, daily-quest, and sub-quest records with separate goal/detail, short description, memo, tags, due date, and due time fields while keeping old persisted data migratable.
- Rebuilt Royal Library item detail pages as reading-first documents. Editing is now an explicit secondary mode, and detailed metadata, tags, timestamps, optional main-quest links, and independent-quest labels remain visible in read mode.
- Expanded archive keyword matching across title, goal/detail, description, memo, project name, and tags.
- Reorganized the Throne Room into My Kingdom: princess profile, real record totals, kingdom status, settings, user-facing connection labels, and logout in the requested order.
- Added local profile/notification/AI-style preferences and JSON record export. Background selection remains descriptive until a user-selectable asset policy is defined.
- Standardized the shared page-heading contrast layer, eyebrow, title, description, and royal divider so headings remain legible over every supplied background.
- Updated the Supabase schema draft with the newly required goal, memo, due-time, and quest-status fields. The schema must be reviewed and applied before the later Supabase repository phase.

### Verification

- Confirmed the Header, compact Library shelf, reading-first main-quest record, Throne Room information hierarchy, and Secret Garden copy structure in the local browser preview.
- `pnpm lint` and `pnpm build` pass. Vite reports only a non-blocking JavaScript chunk-size advisory for the current single application bundle.
- Made `supabase/schema.sql` rerunnable: existing enums, tables, rows, indexes, policies, triggers, and the Rita Storage bucket no longer stop later schema additions, while newly introduced quest fields are added with non-destructive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements.
- Aligned the desktop login logo, princess figure, and welcome copy with a shared responsive safe-area shift while retaining the existing centered mobile composition and login-card position.
- Made the shared glass Header sticky at its existing desktop/mobile inset without making the Footer sticky; the application shell no longer creates an overflow ancestor that prevents sticky positioning.
- Added a data-preserving `calendar_events` upgrade that detects legacy `start_at`, `end_at`, `event_start`, `start_date`, `date`, and timestamp-typed `starts_at/ends_at` columns, converts them to the frontend contract in `Asia/Seoul`, maps legacy categories/priority, and refuses to invent dates when source rows cannot be migrated.
