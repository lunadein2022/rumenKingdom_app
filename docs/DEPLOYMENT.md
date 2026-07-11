# RUMEN KINGDOM deployment

## 1. Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Enable the desired Auth provider in Supabase Authentication.
4. Copy `.env.example` to `.env.local` for local development.
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The browser only receives the Supabase anon key. Row Level Security in the schema limits every table to the signed-in user.

## 2. Claude through Netlify

Set these variables in **Netlify → Site configuration → Environment variables**:

- `ANTHROPIC_API_KEY`: private Anthropic API key
- `CLAUDE_MODEL`: Anthropic model ID to use

The API key is read only by `netlify/functions/claude.js`. Do not create a `VITE_ANTHROPIC_API_KEY` variable because `VITE_` values are bundled into browser code.

For local function testing, use Netlify Dev instead of the plain Vite server:

```bash
netlify dev
```

## 3. Netlify build

The repository includes `netlify.toml` with:

- build command: `pnpm build`
- publish directory: `dist`
- functions directory: `netlify/functions`
- SPA fallback to `index.html`

Connect the Git repository in Netlify and deploy after adding the environment variables.
