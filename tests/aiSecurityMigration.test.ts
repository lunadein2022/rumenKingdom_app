import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync(new URL('../supabase/migrations/202607190007_ai_usage_security_hardening.sql', import.meta.url), 'utf8')
const handler = readFileSync(new URL('../netlify/functions/claude.js', import.meta.url), 'utf8')

test('AI mutation RPCs are service-role only after hardening', () => {
  assert.match(migration, /drop function public\.reserve_ai_usage\(uuid, text, integer\)/)
  assert.match(migration, /grant execute on function public\.reserve_ai_usage\(uuid, uuid, text, integer\) to service_role/)
  assert.match(migration, /grant execute on function public\.finalize_ai_usage\([^)]+\) to service_role/)
  assert.match(migration, /grant execute on function public\.release_ai_usage\(uuid, uuid, text\) to service_role/)
  assert.doesNotMatch(migration, /grant execute on function public\.(?:reserve|finalize|release)_ai_usage\([^)]+\) to authenticated/)
})

test('AI handler separates user authentication from privileged metering', () => {
  assert.match(handler, /authClient\.auth\.getUser\(token\)/)
  assert.match(handler, /createClient\(supabaseUrl, supabaseServiceRoleKey/)
  assert.match(handler, /serviceClient\.rpc\('check_ai_rate_limit'/)
  assert.match(handler, /p_user_id: userId/)
  assert.doesNotMatch(handler, /authClient\.rpc\((?:'|")(?:reserve|finalize|release)_ai_usage/)
})

test('AI handler enforces body and attachment validation before provider calls', () => {
  assert.match(handler, /rateLimit: \{ windowLimit: 60, windowSize: 60, aggregateBy: \['ip'\] \}/)
  assert.match(handler, /Buffer\.byteLength\(rateLimitSecret, 'utf8'\) < 32/)
  assert.match(handler, /Buffer\.byteLength\(rawBody, 'utf8'\) > MAX_AI_REQUEST_BYTES/)
  assert.match(handler, /validateAiInput\(parsed\)/)
  assert.match(handler, /MAX_ATTACHMENT_BYTES/)
})

test('AI handler requires schema-valid request interpretation and records safe failure codes', () => {
  assert.match(handler, /output_config: \{ format: \{ type: 'json_schema', schema: REQUEST_ANALYSIS_SCHEMA \} \}/)
  assert.match(handler, /safeFailureCode\(error\)/)
  assert.match(handler, /code: 'invalid_structured_output'/)
})

test('Rita persona explicitly avoids formal report language', () => {
  assert.match(handler, /공문·보고서·고객센터 같은 딱딱한 문체/)
  assert.match(handler, /리타의 친근한 대화체/)
})
