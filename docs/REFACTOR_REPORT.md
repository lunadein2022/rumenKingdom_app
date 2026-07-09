# Princess OS Refactor Report

## Sprint Scope

This sprint did not add new product features. It reorganized Update 013-027 into a maintainable React/TypeScript app structure with a MockData layer and Supabase-ready service boundaries.

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
- `HomeTopHud.tsx`
- `LiveSerinPanel.tsx`
- `PrincessPresencePanel.tsx`
- `PalaceRoomSection.tsx`
- `CrystalDock.tsx`

Modules:

- `QuestModule.tsx`
- `CalendarModule.tsx`
- `PrincessCharacter.tsx`
- `SystemModule.tsx`
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

## Remaining TODO

- Replace MockData repository with Supabase service composition.
- Add Supabase Auth session routing.
- Connect Serin chat API and memory tables.
- Add route handling once screen priorities are locked.
- Run install/build/test after dependencies are available.

## Technical Debt

- Original HTML pages are reference-only and should not receive new work.
- The current module views preserve product boundaries but still need richer implementation after data wiring.
- Build verification was not run because dependencies are not installed in this workspace.
