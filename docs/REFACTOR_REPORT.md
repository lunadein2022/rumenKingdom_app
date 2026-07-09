# Princess OS Refactor Report

## Sprint Scope

This sprint reorganized Update 013-030 into a mobile-first React/TypeScript web app. It keeps MockData and Supabase-ready service boundaries, but replaces explanation-card placeholders with usable Home, Quest, Calendar, Serin, and Progress interactions.

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

- `PalaceRoomSection.tsx`
- `HomeScene.tsx`

Modules:

- `PrincessCharacter.tsx`
- `QuestScreen.tsx`
- `SerinScreen.tsx`
- `ProgressScreen.tsx`
- `QuestPreview.tsx`
- `ProgressSummary.tsx`
- `CastlePreview.tsx`
- `AchievementPreview.tsx`
- `InventoryPreview.tsx`

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

## Remaining TODO

- Replace MockData repository with Supabase service composition.
- Move Quest completion into a Supabase RPC transaction.
- Add Supabase Auth session routing.
- Connect Serin chat API, streaming, OCR, voice input, and memory persistence.
- Replace temporary generated transparent PNG cutouts with art-directed transparent character exports.
- Add route handling once screen priorities are locked.

## Technical Debt

- Original HTML pages are reference-only and should not receive new work.
- Character cutouts were generated from existing non-transparent PNGs; final transparent source assets should replace them.
- Build verification passed locally with `tsc -b` and `vite build`.
