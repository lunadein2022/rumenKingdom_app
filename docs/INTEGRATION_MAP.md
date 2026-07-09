# Update Integration Map

| Update | Refactor destination |
| --- | --- |
| 013 Search Bar | Design-system pattern, pending command/search component |
| 014 Dialog | Design-system modal boundary pending |
| 015 Calendar Components | `CalendarModule.tsx` + `calendar_events` schema |
| 016 Quest Components | `QuestModule.tsx` + `quests` schema |
| 017 Progress System | `mockProgress.ts`, `ProgressBar.tsx`, `user_progress`, `daily_completions` |
| 018 Home Layout | Superseded by Home Scene Ultimate |
| 019 Home Screen v2 | `legacy/home-screen-v2.html` |
| 020 Quest Screen | `QuestModule.tsx` |
| 021 Calendar Screen | `CalendarModule.tsx` |
| 022 Serin AI Screen | `SystemModule.tsx` Serin boundary + `serinService.ts` |
| 023 Home Scene Ultimate | `HomeScene.tsx` as main Home |
| 024 Castle Growth System | `SystemModule.tsx` Castle boundary + `castleService.ts` |
| 025 Achievement System | `SystemModule.tsx` Achievement boundary + achievement schema |
| 026 Inventory System | `SystemModule.tsx` Inventory boundary + inventory schema |
| 027 Princess Character System | `PrincessCharacter.tsx` + `princessService.ts` |

The refactor preserves current scope and turns concept boards into a service-ready app structure.
