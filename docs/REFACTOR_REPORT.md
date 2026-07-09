# Princess OS Refactor Report

## Sprint Scope

This sprint reorganized Update 013-033 into a mobile-first React/TypeScript web app. It keeps MockData and Supabase-ready service boundaries, removes preview/showcase UI, and restores Princess OS as a place-based Alpha app rather than a dashboard.

## Final Folder Structure

```text
princess-os-refactor/
  index.html
  package.json
  public/assets/
  src/
    app/
      App.tsx
      types.ts
    domain/
      questDomain.ts
    features/
      calendar/
      castle/
      diary/
      garden/
      library/
      princess/
      serin/
    components/
      design-system/
      home/
      modules/
    data/
      mockHome.ts
      mockProgress.ts
      mockPrincess.ts
      mockSerin.ts
      mockCastle.ts
      mockQuests.ts
      mockInventory.ts
      mockRepository.ts
      selectors.ts
    services/supabase/
      client.ts
      types.ts
      progressService.ts
      questService.ts
      princessService.ts
      castleService.ts
      serinService.ts
      schemaMap.ts
    styles/
      tokens.css
      global.css
      components.css
      home-scene.css
      modules.css
  supabase/schema.sql
  legacy/
  docs/
```

## Main Entry

- App entry: `src/main.tsx`
- App shell: `src/app/App.tsx`
- Main Home route: `src/components/home/HomeScene.tsx`
- Netlify build config: `netlify.toml`

## Legacy Files

- `legacy/home-screen-v2.html`
- `legacy/home-scene-ultimate-original.html`

Home Screen v2 is preserved as legacy. The active Home is the reconstructed Home Scene Ultimate.

## New Component Structure

Design system:

- `Button.tsx`
- `Card.tsx`
- `Badge.tsx`
- `ProgressBar.tsx`
- `GlassPanel.tsx`
- `TopAppBar.tsx`
- `BottomNav.tsx`

Home:

- `HomeScene.tsx`

Active feature pages:

- `features/calendar/pages/CalendarPage.tsx`
- `features/castle/pages/CastlePage.tsx`
- `features/garden/pages/GardenPage.tsx`
- `features/library/pages/LibraryPage.tsx`
- `features/princess/pages/PrincessPage.tsx`
- `features/serin/components/SerinPage.tsx`
- `components/modules/QuestScreen.tsx`
- `components/modules/ProgressScreen.tsx`

## MockData Structure

All UI data flows through `mockRepository.ts`; components receive props and do not own product numbers.

- `mockHome.ts`: calendar events and Home support data
- `mockProgress.ts`: progress calculation model
- `mockPrincess.ts`: princess profile and royal titles
- `mockSerin.ts`: Serin profile and relationship data
- `mockCastle.ts`: palace rooms
- `mockQuests.ts`: quest list
- `mockInventory.ts`: achievements and inventory items

## Supabase Connection Points

- `client.ts`: env-based Supabase client
- `types.ts`: Supabase row types
- `progressService.ts`: user_progress and daily_completions
- `questService.ts`: quests and today quest queries
- `princessService.ts`: princess_profiles and user_titles
- `castleService.ts`: castle_rooms
- `castle_state`, `room_decorations`: Castle Domain state and growth
- `serinService.ts`: serin_memory and serin_conversations

Unified SQL lives in `supabase/schema.sql`.

## Update 028 Quest Domain

Quest is now treated as the central Princess OS domain rather than a todo list. The domain layer defines:

- Quest types: Main, Side, Daily, Routine, Story
- Completion flow: check, glow, EXP, reward, level, castle, achievement, notification, history
- Active quest filtering by type
- Quest history records for the 왕국도서관
- Mock completion pipeline that updates progress, EXP, reward state, and history

Quest Domain is the hub for Calendar, Serin, Castle, Achievement, Inventory, Diary, and Notification. The UI is a result of the domain model, not the source of truth.

## Update 029 Calendar Domain

Calendar now lives under `src/features/calendar/` with typed events, month/day/timeline views, reminder panel, event creation, completion/cancellation, Serin intent handoff, and Quest linking.

## Update 030 Serin Domain

Serin now lives under `src/features/serin/` and is treated as the AI maid interface for the whole OS, not a plain chat box. The domain includes:

- Intent parser for chat, quest, calendar, diary, contact, memory, reward, and unknown intents
- Confirmation card flow before creating Quest or Calendar data
- Mock Serin service with TODO markers for the real AI API
- Memory service and visible memory panel
- Attachment action placeholders for image, document, and audio
- Supabase-ready `serin_conversations`, `serin_messages`, `serin_memory`, `contacts`, `relationship_book`, and `diary_drafts`

## Update 031 Castle Domain

Castle now lives under `src/features/castle/` and is treated as the Princess OS map, not a menu. Home remains the Lobby, while Castle provides room swipe, arrows, fast travel, room unlock state, room upgrade state, and Castle EXP.

- Rooms: Lobby, Throne, Library, Office, Garden, Bedroom, Tower, Secret Garden
- Movement: swipe-style selector, arrow controls, and fast travel
- Growth: `CastleState`, room level, visited count, decorations, unlock level
- Supabase-ready `castle_rooms`, `castle_state`, and `room_decorations`
- Castle navigation no longer duplicates room selectors: fast travel is shown once, and carousel keeps arrow movement only.
- Kingdom Library and Garden are now independent pages instead of routing to Serin.

## Update 032 Princess Domain

Princess now starts moving from a weak profile page into `src/features/princess/`. The page treats the princess as the player character with full-body presence, level/EXP, six stats, equipment, and a daily Fate card.

- Supabase-ready `princess_profiles`, `princess_stats`, `princess_equipment`, and `princess_diary`
- Garden is a non-productivity rest scene with garden image and princess presence
- Kingdom Library is the archive for completed quests, past events, Serin records, diary, and contacts

## Alpha Structure Cleanup

- Removed unused preview/showcase components from the active source tree.
- Home is now a palace lobby scene with only briefing, today's schedule count, today's quest count, level, princess, and Serin.
- Castle is now a room movement hub: fast travel plus arrow carousel, each room shown as a full scene.
- Kingdom Library is an independent archive page instead of routing to Serin.
- Garden is an independent rest page with full-screen garden background, princess presence, and Serin healing copy only.
- Supabase policies are dropped before creation so `schema.sql` can be rerun without duplicate-policy errors.

## Regression Fixes

- App Shell is now Desktop First: 1440px-oriented responsive Personal OS layout with desktop sidebar, tablet collapse, and mobile BottomNav.
- Castle room unlock state is derived from user level through `deriveRoomUnlockState()` and refreshed through `checkRoomUnlocks()`.
- The Throne Room is accessible in Alpha at the current mock level and links to Growth, Achievement/Reward, and Princess Character surfaces.
- `netlify/functions/serin-chat.js` is restored and `serinService.sendMessage()` calls `/.netlify/functions/serin-chat` first.
- Mock Serin replies are now fallback-only through `fallbackSerinResponse()` when the API call fails.

## Time Navigation Principle

Calendar, Quest, and Diary domains must support past, current, and future data. Calendar now supports previous/next month navigation. Quest now supports type filters plus Previous / Current / Future / All scopes. Diary has a typed range service ready for Bedroom and Library views.

## Remaining TODO

- Replace MockData repository with Supabase service composition.
- Move Quest completion into a Supabase RPC transaction.
- Add Supabase Auth session routing.
- Connect Serin chat API, streaming, OCR, voice input, and memory persistence.
- Build full Diary and Library pages on top of the new date-range services.
- Replace temporary generated transparent PNG cutouts with art-directed transparent character exports.
- Add route handling once screen priorities are locked.

## Technical Debt

- Original HTML pages are reference-only and should not receive new work.
- Character cutouts were generated from existing non-transparent PNGs; final transparent source assets should replace them.
- Build verification passed locally with `tsc -b` and `vite build`.
