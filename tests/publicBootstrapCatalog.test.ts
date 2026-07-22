import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const fix = readFileSync(new URL('../supabase/migrations/202607200015_fix_public_bootstrap_catalog_sort.sql', import.meta.url), 'utf8')

test('get_public_app_bootstrap selects every column it later orders or aggregates by', () => {
  // The 013/014 bug: the catalog subquery ordered by item.sort_order without
  // selecting sort_order, which made every bootstrap call fail with 42703 and
  // silently fall back to bundled client defaults (config, announcements,
  // catalog and releases never actually reached real users).
  const catalogBlock = fix.match(/'catalog', coalesce\(\(([\s\S]*?)\), '\[\]'::jsonb\)/)?.[1] ?? ''
  assert.ok(catalogBlock, 'catalog block should exist in the bootstrap function')
  const selectList = catalogBlock.match(/select ([\s\S]*?)\n\s*from public\.app_catalog_items/)?.[1] ?? ''
  assert.match(selectList, /\bsort_order\b/, 'catalog subquery must select sort_order since it orders by item.sort_order')
  assert.match(catalogBlock, /order by item\.sort_order, item\.product_key/)
})
