import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
const status = readFileSync(new URL('../src/components/WebAppStatus.tsx', import.meta.url), 'utf8')
const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
const netlify = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('service worker caches only the app shell and bypasses authenticated server APIs', () => {
  assert.match(worker, /request\.method !== 'GET'/)
  assert.match(worker, /url\.pathname\.startsWith\('\/\.netlify\/functions\/'\)/)
  assert.match(worker, /request\.headers\.has\('authorization'\)/)
  assert.match(worker, /request\.mode === 'navigate'/)
  assert.match(worker, /SKIP_WAITING/)
})

test('web app exposes install, update and offline states', () => {
  assert.match(status, /beforeinstallprompt/)
  assert.match(status, /navigator\.serviceWorker\.register\('\/sw\.js'/)
  assert.match(status, /controllerchange/)
  assert.match(status, /오프라인 상태/)
})

test('manifest and hosting headers are release ready', () => {
  assert.equal(manifest.lang, 'ko-KR')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.icons[0].sizes, '512x512')
  assert.deepEqual(manifest.shortcuts.map((item: { url: string }) => item.url), ['/calendar', '/rita'])
  assert.match(netlify, /for = "\/sw\.js"[\s\S]+no-cache, no-store, must-revalidate/)
  assert.match(netlify, /X-Frame-Options = "DENY"/)
  assert.match(html, /apple-mobile-web-app-capable/)
})
