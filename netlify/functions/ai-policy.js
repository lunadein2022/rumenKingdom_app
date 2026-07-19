const MEBIBYTE = 1024 * 1024
export const MAX_AI_REQUEST_BYTES = 6 * MEBIBYTE
export const MAX_ATTACHMENT_BYTES = 4 * MEBIBYTE

const ACTIONS = new Set(['chat', 'interpret-request', 'analyze-attachment'])
const RESPONSE_STYLES = new Set(['concise', 'warm', 'detailed'])
const ATTACHMENT_INTENTS = new Set(['business-card', 'document', 'audio'])
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
])
const AUDIO_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/x-m4a',
  'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg',
])

export const AI_TIER_LIMITS = Object.freeze({
  free: Object.freeze({ monthlyPoints: 4, dailyRequests: 8, signupBonus: 12 }),
  royal: Object.freeze({ monthlyPoints: 69, dailyRequests: 40, signupBonus: 12 }),
  royal_ai: Object.freeze({ monthlyPoints: 288, dailyRequests: 100, signupBonus: 12 }),
})

function attachmentBytes(attachment = {}) {
  const encoded = typeof attachment.data === 'string' ? attachment.data : ''
  if (encoded) {
    const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0
    return Math.max(0, Math.floor(encoded.length * 3 / 4) - padding)
  }
  return Math.max(0, Number(attachment.size) || 0)
}

function requestError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode })
}

function cleanFilename(value) {
  return String(value ?? 'attachment')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 150) || 'attachment'
}

function normalizeMessages(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((message) => message?.role === 'user' || message?.role === 'assistant')
    .slice(-8)
    .map((message) => ({ role: message.role, content: String(message.content ?? '').slice(0, 4000) }))
    .filter((message) => message.content.trim())
}

export function validateAiInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw requestError('올바른 AI 요청 형식이 필요합니다.')
  if (!ACTIONS.has(value.action)) throw requestError('지원하지 않는 AI 작업입니다.')

  const responseStyle = RESPONSE_STYLES.has(value.responseStyle) ? value.responseStyle : 'concise'
  const input = { ...value, action: value.action, responseStyle }

  if (value.action === 'chat' || value.action === 'interpret-request') {
    input.messages = normalizeMessages(value.messages)
    if (!input.messages.length) throw requestError(value.action === 'chat' ? '대화 내용이 필요합니다.' : '분석할 요청이 필요합니다.')
  }

  if (value.action === 'interpret-request') {
    input.projects = Array.isArray(value.projects) ? value.projects.slice(0, 30) : []
    input.now = String(value.now ?? new Date().toISOString()).slice(0, 64)
    input.timeZone = String(value.timeZone ?? 'Asia/Seoul').slice(0, 64)
  }

  if (value.action === 'analyze-attachment') {
    if (!ATTACHMENT_INTENTS.has(value.intent)) throw requestError('지원하지 않는 첨부 분석 작업입니다.')
    const attachment = value.attachment
    if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) throw requestError('첨부 파일이 필요합니다.')
    const data = typeof attachment.data === 'string' ? attachment.data : ''
    if (!data || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) throw requestError('첨부 파일 형식이 올바르지 않습니다.')
    const size = attachmentBytes({ data })
    if (!size) throw requestError('첨부 파일이 비어 있습니다.')
    if (size > MAX_ATTACHMENT_BYTES) throw requestError('현재 첨부 파일은 4MB 이하만 분석할 수 있습니다.', 413)

    const mimeType = String(attachment.mimeType ?? '').toLowerCase().slice(0, 100)
    const allowed = value.intent === 'business-card' ? IMAGE_TYPES : value.intent === 'audio' ? AUDIO_TYPES : DOCUMENT_TYPES
    if (!allowed.has(mimeType)) throw requestError('지원하지 않는 첨부 파일 형식입니다.', 415)

    input.intent = value.intent
    input.attachment = { name: cleanFilename(attachment.name), mimeType, size, data }
  }

  return input
}

export function pointsForRequest(input = {}) {
  if (input.action === 'interpret-request') return 1
  if (input.action !== 'analyze-attachment') return input.responseStyle === 'detailed' ? 4 : 1

  const bytes = attachmentBytes(input.attachment)
  if (input.intent === 'business-card') return 5
  if (input.intent === 'audio') return Math.min(30, 5 + Math.ceil(bytes / MEBIBYTE) * 4)
  return Math.min(30, 5 + Math.ceil(bytes / MEBIBYTE) * 5)
}

export function modelForRequest(input, models) {
  const needsDetailedModel = input?.responseStyle === 'detailed' || input?.action === 'analyze-attachment'
  return needsDetailedModel ? models.sonnet : models.haiku
}

function modelPricing(model = '') {
  const normalized = model.toLowerCase()
  if (normalized.includes('haiku')) return { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 }
  if (normalized.includes('opus')) return { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 }
  return { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 }
}

export function estimateClaudeCostUsd(model, usage = {}) {
  const pricing = modelPricing(model)
  const million = 1_000_000
  const input = Math.max(0, Number(usage.input_tokens) || 0)
  const output = Math.max(0, Number(usage.output_tokens) || 0)
  const cacheWrite = Math.max(0, Number(usage.cache_creation_input_tokens) || 0)
  const cacheRead = Math.max(0, Number(usage.cache_read_input_tokens) || 0)
  return (
    input * pricing.input
    + output * pricing.output
    + cacheWrite * pricing.cacheWrite
    + cacheRead * pricing.cacheRead
  ) / million
}
