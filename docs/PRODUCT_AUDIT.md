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

## 2026-07 authentication resilience and Office drag reliability

- Capped the blocking authentication bootstrap at four seconds so a delayed Supabase session request cannot hold the application on the palace loading screen indefinitely.
- Added failure-safe session initialization, late-session recovery, and a user-facing connection notice on the login screen.
- Wrapped password sign-in, account creation, password reset, and Google OAuth in consistent loading, exception, and localized error handling while preserving Supabase email-confirmation behavior.
- Normalized authentication redirects to the application origin root for local and Netlify allow-list compatibility.
- Replaced whole-row quest dragging with a dedicated desktop drag handle so checkbox, edit, and delete controls no longer compete with native drag initiation.
- Made Office drops read the quest identifier directly from `dataTransfer`, with a synchronous ref fallback, instead of depending on React state committing before the pointer reaches a main quest.
- Confirmed the latest production bundle renders one drag handle per visible quest and reaches the login screen immediately when Supabase is not configured locally.

## 2026-07 Office pointer drag and mobile quest readability

- Replaced the unreliable native HTML5 quest drag gesture with a desktop pointer-driven interaction that tracks the cursor, highlights the main quest under it, and connects the quest on release.
- Allowed users to begin dragging from either the grip or the quest title area while preserving normal checkbox, edit, and delete button behavior.
- Kept the independent-quest drop zone compatible with the same pointer flow.
- Rebuilt the mobile quest row with named grid areas so the checkbox, title, project label, due time, priority, edit, and delete controls cannot be auto-placed into the wrong columns.
- Hid the desktop-only drag grip below 650px and gave the quest title the flexible mobile column.
- Verified a real cursor drag from an independent quest to `Hydro Hawk`, including the updated project label and success toast, then restored the test record to its original independent state.
- Verified at a 557px viewport that the quest copy receives 356px of usable width and edit/delete remain aligned on the right edge.

## 2026-07 responsive Royal Library shelf alignment

- Replaced the fixed two-column, left-aligned mobile Library grid with a centered wrapping shelf while preserving the compact 112px book-cover size.
- The shelf now uses the available width without stretching the supplied cover artwork, and incomplete final rows are centered instead of leaving a large empty area on the right.
- Verified four centered books plus a centered three-book final row at 618px, and two centered books per row at 390px.

## 2026-07 Rita verified quest and schedule actions

- Replaced Rita's text-only claims with a structured request interpreter that classifies user language as a quest, calendar event, memorandum, clarification, or general conversation.
- Added explicit language rules so action-oriented reminders such as calling someone become quests, while meetings, trips, reservations, and date ranges become calendar events.
- Added editable confirmation cards for quests and schedules. Rita never writes data until the user reviews and confirms the draft.
- Passed active main-quest candidates to Rita and added a required project selector when a requested subquest cannot be matched confidently; independent quests remain available without requiring users to remember exact project names.
- Connected confirmed quest drafts to the existing Office store and confirmed schedule drafts to the real calendar repository. Rita reports success only after the calendar write resolves and offers a direct link to the saved destination.
- Added multi-day and all-day calendar fields across the application type, repository, schema, create/edit forms, detail view, Lobby totals, Header notifications, and calendar day/range rendering.
- Made calendar creation rollback its optimistic row when Supabase persistence fails, preventing a failed write from looking successful in Rita or the calendar.
- Extended the rerunnable Supabase schema with non-destructive `end_date` and `all_day` columns, preserving existing rows by setting their end date to their original event date.

### Deployment requirement

- Apply the updated `supabase/schema.sql` before testing Rita-created schedules in production. The deployed repository now reads and writes `calendar_events.end_date` and `calendar_events.all_day`.

## 2026-07 account data isolation

- Replaced the shared browser-wide kingdom cache with reset-generation account stores named `rumen-kingdom:v2:user:{userId}` and a separate `rumen-kingdom:v2:guest` store.
- Disabled automatic hydration of the legacy shared demo cache. Its contents remain untouched for a later explicit owner-confirmed import and are never copied into every account.
- Authenticated accounts now start empty instead of inheriting demo projects, quests, records, and diaries; only Guest mode receives demo content.
- Added an account preparation gate that hides the application while switching stores and hydrating the signed-in user's calendar, preventing a previous account's in-memory data from flashing on screen.
- Logout immediately changes persistence to a locked transient scope and clears in-memory kingdom data without overwriting the signed-out account's own cache.
- Scoped Rita conversation history, princess profile copy, in-app notification preference, and Rita response-style preference to the active account or Guest scope.
- Kept Supabase RLS as the authoritative cloud boundary and added `auth.uid()` defaults to every user-owned table so future browser inserts cannot accidentally omit ownership.
- Corrected the Throne Room connection copy: all records are separated per account on the device, while only the calendar currently claims cloud synchronization.

### Remaining cloud phase

- Main quests, daily/sub quests, memoranda, relationships, diaries, profile preferences, and Rita conversations still require dedicated Supabase repositories for cross-device synchronization. Their current account-scoped browser caches prevent same-browser account leakage but are not yet cloud backups.

## 2026-07 dedicated Demo Kingdom and clean-account reset

- Made `데모 왕국 둘러보기` permanently available from the Login screen, regardless of whether Supabase is configured, with concise copy explaining that it contains example records.
- Added a visible desktop `DEMO MODE` badge, changed logout copy to Login in Demo mode, and added a `로그인해서 내 왕국 만들기` action in the Throne Room.
- Kept Demo edits inside the dedicated Guest cache and added a confirmation-protected `데모 데이터 초기화` action that restores the original example projects, quests, schedules, memoranda, relationships, and diary.
- Disabled Rita network requests and attachment analysis in Demo mode so anonymous visitors cannot consume authenticated AI services; the Rita screen remains available as a preview.
- Advanced browser caches to the `v2` data generation so every currently registered account starts with an empty account-scoped local kingdom after deployment. Older shared or per-account caches remain unread and are not silently assigned to any user.
- Added `supabase/reset_all_app_data.sql` as an explicit one-time destructive reset that clears application rows for all users while preserving `auth.users` and resetting profile display copy.
- The reset SQL intentionally does not delete Storage objects directly. The private `rita-attachments` bucket must be emptied through Supabase Storage to avoid orphaning physical objects.

## 2026-07 canonical data model and ownership boundary

- Added `docs/ERD.md` and `docs/DATA_MODEL.md` as the source of truth for entities, relationships, lifecycle rules, the 06:00 service-day boundary, Library projections, and Storage paths.
- Confirmed that a main quest is an optional project link rather than the parent table for every execution item, and selected a unified `quests` table with `daily`/`sub` kinds to match the existing frontend domain model.
- Added repository contracts for projects, quests, calendars, diaries, memoranda, relationships, notifications, and settings so UI work can remain independent of Zustand versus Supabase data sources.
- Added a rerunnable, non-destructive canonical migration. It copies legacy `daily_quests` and `sub_quests` into `quests`, preserves the legacy tables during repository cutover, and adds memoranda, diary snapshots, calendar categories, recurrence exceptions, reminders, user settings, and room backgrounds.
- Added composite ownership foreign keys such as `(main_quest_id, user_id) -> main_quests(id, user_id)` so records that individually pass RLS still cannot reference another account's parent record.
- Added RLS to every newly introduced user table and a private `room-backgrounds` Storage bucket whose path must begin with the authenticated user's id.
- Kept diary quest snapshots after a source quest is deleted and detached quests/memoranda when their linked project is removed.
- Extended the one-time account reset script to cover the canonical tables while continuing to preserve `auth.users`.

## 2026-07 cloud repository contract repair

- Aligned project repositories with `main_quests.starts_on`, `due_on`, and `manual_progress`; aligned diaries with `diary_entries.body`; and aligned relationships with `relationship_type`.
- Added rerunnable inline tag columns for projects, quests, memoranda, diaries, and relationships so the current UI does not silently lose tags during the later normalized-tag transition.
- Corrected legacy quest migration to preserve descriptions, priorities, recurrence rules, and original completion timestamps instead of substituting placeholders.
- Changed project, quest, memorandum, relationship, and diary mutations to await their Supabase result for authenticated accounts. Failed optimistic changes now roll back and surface a shared record-sync message.
- Rita now reports a project or quest as added only after the corresponding store action confirms persistence.
- Library favorites now use the same cloud-backed update path as ordinary edits.
- Added a shared Asia/Seoul service-date calculation with a 06:00 boundary and automatic rollover hook, then applied it to Lobby, Office, Diary, and Header daily summaries.
