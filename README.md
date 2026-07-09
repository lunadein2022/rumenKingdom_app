# Princess OS

React + TypeScript refactor of the Princess OS prototype.

## Run

```bash
npm install
npm run dev
```

## Netlify

Use the project root as the deploy root.

```text
Build command: npm run build
Publish directory: dist
```

`netlify.toml` already contains those settings.

Main files:

- `src/main.tsx`
- `src/app/App.tsx`
- `src/components/home/HomeScene.tsx`
- `src/data/mockRepository.ts`
- `supabase/schema.sql`

## Direction

Princess OS is not a themed todo app. It is a princess simulation, AI maid assistant, and growth-based life OS.

Main rules:

- Supabase only. Do not introduce alternate backend concepts.
- Home uses the Live Palace Scene direction.
- The princess and Serin must have balanced visual weight.
- Data must flow through MockData now, then Supabase later.
- Royal Blue, Glass, and restrained Gold accents remain the design system base.
