# Princess OS UI Layout Contract

## Product Frame
Princess OS is a full viewport fantasy palace website, not a 430px mobile app shell. Every scene must render inside one shared coordinate system.

## Fixed Chrome
- Top banner is fixed on every page.
- Bottom navigation is fixed on every page.
- Scene content may never overlap either chrome area.
- Serin entry exists only in the center item of the bottom navigation.

## Core Tokens
- `--layout-top`: top banner height.
- `--layout-bottom`: bottom navigation height.
- `--layout-side`: outer desktop side margin.
- `--layout-gap`: gap between major panels.
- `--layout-left`: desktop left rail width.
- `--layout-right`: desktop right rail width.
- `--layout-stage-top`: first usable y-position under top banner.
- `--layout-stage-bottom`: bottom safe position above bottom nav.

## Desktop Grid
Use this structure unless a scene is intentionally minimal:

```text
fixed top banner

[left rail] [main stage] [right rail]

fixed bottom navigation
```

- Left rail: summaries, filters, categories, compact navigation.
- Main stage: primary work surface or character/scene focus.
- Right rail: selected detail, related records, secondary status.
- Panels should be 0.76-0.86 opacity glass, not opaque white cards.

## Scene Rules
- Background is full-screen scene image.
- HUD panels are overlays inside the safe area only.
- No panel can be positioned above `--layout-stage-top`.
- No panel can extend below `--layout-stage-bottom`.
- Floating Serin widgets are forbidden outside the Serin page.
- Empty states must occupy the same footprint as data states to prevent layout jumps.

## Page Layouts
- Lobby: left briefing, center princess/room, right palace movement. No right Serin panel.
- Office: left quest/project list, center project detail, right updates/related quests.
- Calendar: left month controls/summary, center month grid, right selected day detail.
- Library: left search/filter/category, center dense virtualized list, right record detail.
- Bedroom: left day summary, center diary editor, right previous diaries.
- Throne: left decisions, center princess/growth summary, right kingdom stats.
- Garden: minimal panels only; no productivity widgets.
- Serin: left Serin identity/full body, right chat thread.

## Scale
- Major panels: 300-380px rails, center fills remaining space.
- Panel padding: 16-22px.
- Button height: 36-42px.
- Compact list row: 44-58px.
- Detailed card row: 68-96px.
- Decorative category objects cannot consume more than 24% of scene height.

## Responsive
- >= 1280px: 3-column desktop layout.
- 900-1279px: 2-column layout; right rail moves below or collapses.
- <= 899px: single-column scroll inside safe area; bottom nav remains fixed.
