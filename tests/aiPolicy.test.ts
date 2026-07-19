import test from 'node:test'
import assert from 'node:assert/strict'
import { AI_TIER_LIMITS, estimateClaudeCostUsd, modelForRequest, pointsForRequest, validateAiInput } from '../netlify/functions/ai-policy.js'

test('AI tier limits match the approved launch allowances', () => {
  assert.deepEqual(AI_TIER_LIMITS.free, { monthlyPoints: 4, dailyRequests: 8, signupBonus: 12 })
  assert.equal(AI_TIER_LIMITS.royal.monthlyPoints, 69)
  assert.equal(AI_TIER_LIMITS.royal_ai.monthlyPoints, 288)
})

test('request points increase for detailed and attachment work', () => {
  assert.equal(pointsForRequest({ action: 'chat', responseStyle: 'concise' }), 1)
  assert.equal(pointsForRequest({ action: 'chat', responseStyle: 'detailed' }), 4)
  assert.equal(pointsForRequest({ action: 'interpret-request' }), 1)
  assert.equal(pointsForRequest({ action: 'analyze-attachment', intent: 'business-card' }), 5)
  assert.equal(pointsForRequest({ action: 'analyze-attachment', intent: 'document', attachment: { size: 2 * 1024 * 1024 } }), 15)
  assert.equal(pointsForRequest({ action: 'analyze-attachment', intent: 'document', attachment: { size: 20 * 1024 * 1024 } }), 30)
})

test('model routing keeps basic work on Haiku and detailed work on Sonnet', () => {
  const models = { haiku: 'claude-haiku', sonnet: 'claude-sonnet' }
  assert.equal(modelForRequest({ action: 'chat', responseStyle: 'concise' }, models), models.haiku)
  assert.equal(modelForRequest({ action: 'chat', responseStyle: 'detailed' }, models), models.sonnet)
  assert.equal(modelForRequest({ action: 'interpret-request', responseStyle: 'concise' }, models), models.haiku)
  assert.equal(modelForRequest({ action: 'interpret-request', responseStyle: 'detailed' }, models), models.sonnet)
  assert.equal(modelForRequest({ action: 'analyze-attachment' }, models), models.sonnet)
})

test('Claude cost estimation accounts for input, output and cached tokens', () => {
  assert.equal(estimateClaudeCostUsd('claude-haiku', { input_tokens: 2_000, output_tokens: 500 }), 0.0045)
  assert.equal(estimateClaudeCostUsd('claude-sonnet', { input_tokens: 2_000, output_tokens: 500 }), 0.0135)
  assert.equal(estimateClaudeCostUsd('claude-haiku', { cache_creation_input_tokens: 1_000, cache_read_input_tokens: 1_000 }), 0.00135)
})

test('AI input validation rejects unknown actions and empty conversations', () => {
  assert.throws(() => validateAiInput({ action: 'admin' }), (error: Error & { statusCode?: number }) => error.statusCode === 400)
  assert.throws(() => validateAiInput({ action: 'chat', messages: [] }), (error: Error & { statusCode?: number }) => error.statusCode === 400)
})

test('AI input validation normalizes bounded chat history', () => {
  const input = validateAiInput({
    action: 'chat',
    responseStyle: 'unknown',
    messages: Array.from({ length: 12 }, (_, index) => ({ role: 'user', content: `message-${index}` })),
  })
  assert.equal(input.responseStyle, 'concise')
  assert.equal(input.messages.length, 8)
  assert.equal(input.messages[0].content, 'message-4')
})

test('attachment validation enforces intent MIME types and sanitizes names', () => {
  const data = Buffer.from('hello').toString('base64')
  assert.throws(
    () => validateAiInput({ action: 'analyze-attachment', intent: 'audio', attachment: { data, mimeType: 'text/plain' } }),
    (error: Error & { statusCode?: number }) => error.statusCode === 415,
  )
  const input = validateAiInput({
    action: 'analyze-attachment',
    intent: 'document',
    attachment: { data, mimeType: 'text/plain', name: `\u0000${'a'.repeat(200)}.txt` },
  })
  assert.equal(input.attachment.name.length, 150)
  assert.equal(input.attachment.size, 5)
})
