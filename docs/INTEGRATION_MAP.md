# Update Integration Map

| Update | Refactor destination |
| --- | --- |
| 013 Search Bar | Design-system pattern, pending command/search component |
| 014 Dialog | Design-system modal boundary pending |
| 015/029 Calendar Domain | `features/calendar/*` + `calendar_events` / `calendar_reminders` schema |
| 016 Quest Components | Superseded by `QuestScreen.tsx` + `quests` schema |
| 017 Progress System | `mockProgress.ts`, `ProgressBar.tsx`, `user_progress`, `daily_completions` |
| 018 Home Layout | Superseded by Home Scene Ultimate |
| 019 Home Screen v2 | `legacy/home-screen-v2.html` |
| 020 Quest Screen | `QuestScreen.tsx` |
| 021 Calendar Screen | Superseded by `features/calendar/pages/CalendarPage.tsx` |
| 022 Serin AI Screen | Superseded by `features/serin/components/SerinPage.tsx` |
| 023 Home Scene Ultimate | `HomeScene.tsx` as main Home |
| 024 Castle Growth System | `features/castle/*` + `castleService.ts` |
| 025 Achievement System | Progress/Princess reward data + achievement schema |
| 026 Inventory System | Princess reward/equipment data + inventory schema |
| 027 Princess Character System | `features/princess/*` + `princessService.ts` |
| 028 Quest Domain | `questDomain.ts`, `QuestScreen.tsx`, `quests`, `quest_history` |
| 029 Calendar Domain | `features/calendar/*`, `calendar_events`, `calendar_reminders` |
| 030 Serin Domain | `features/serin/*`, `serin_conversations`, `serin_messages`, `serin_memory`, `contacts`, `diary_drafts` |
| 031 Castle Domain | `features/castle/*`, `castle_rooms`, `castle_state`, `room_decorations` |
| 032 Princess Domain | `features/princess/*`, `princess_profiles`, `princess_stats`, `princess_equipment`, `princess_diary` |
| Kingdom Library / Garden Fix | `features/library/pages/LibraryPage.tsx`, `features/garden/pages/GardenPage.tsx` |
| Cross-domain Time Navigation | Calendar previous/next months, Quest past/current/future/all filters, Diary range service |
| Alpha Structure Cleanup | Removed preview/showcase components, full-screen place scenes, idempotent Supabase policies |

The refactor preserves current scope and turns concept boards into a service-ready app structure.
