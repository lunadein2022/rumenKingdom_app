const MEBIBYTE = 1024 * 1024
export const MAX_AI_REQUEST_BYTES = 6 * MEBIBYTE
export const MAX_ATTACHMENT_BYTES = 25 * MEBIBYTE
export const MAX_DOCUMENT_BYTES = 10 * MEBIBYTE
export const MAX_HWP_BYTES = 20 * MEBIBYTE

const ACTIONS = new Set(['chat', 'interpret-request', 'analyze-attachment'])
const RESPONSE_STYLES = new Set(['concise', 'warm', 'detailed'])
const ATTACHMENT_INTENTS = new Set(['business-card', 'document', 'audio'])
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/x-hwp',
  'application/haansofthwp',
  'application/vnd.hancom.hwpx',
  'application/hwp+zip',
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

export const DEFAULT_AI_POINT_POLICY = Object.freeze({
  requestCosts: Object.freeze({
    chat: Object.freeze({ concise: 1, warm: 1, detailed: 4 }),
    interpretRequest: 1,
    attachment: Object.freeze({ businessCard: 5, audioBase: 5, audioPerMiB: 4, documentBase: 5, documentPerMiB: 5, maximum: 30 }),
  }),
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

function cleanStoragePath(value) {
  const path = String(value ?? '').trim()
  if (!path || path.length > 400 || path.includes('..') || !/^[a-zA-Z0-9/_\-.]+$/.test(path)) return ''
  return path
}

function isHwpAttachment(attachment = {}) {
  return /\.(?:hwp|hwpx)$/i.test(String(attachment.name ?? ''))
    || ['application/x-hwp', 'application/haansofthwp', 'application/vnd.hancom.hwpx', 'application/hwp+zip'].includes(String(attachment.mimeType ?? '').toLowerCase())
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
    const storagePath = cleanStoragePath(attachment.storagePath)
    if (!storagePath && (!data || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data))) throw requestError('첨부 파일 형식이 올바르지 않습니다.')
    const size = storagePath ? Math.max(0, Number(attachment.size) || 0) : attachmentBytes({ data })
    if (!size) throw requestError('첨부 파일이 비어 있습니다.')
    const maximum = value.intent === 'audio' ? MAX_ATTACHMENT_BYTES : isHwpAttachment(attachment) ? MAX_HWP_BYTES : MAX_DOCUMENT_BYTES
    if (size > maximum) throw requestError(value.intent === 'audio'
      ? '음성 파일은 25MB·30분 이하만 분석할 수 있습니다.'
      : isHwpAttachment(attachment) ? 'HWP·HWPX 파일은 20MB·200쪽 이하만 분석할 수 있습니다.' : '문서와 이미지는 10MB 이하만 분석할 수 있습니다.', 413)

    const mimeType = String(attachment.mimeType ?? '').toLowerCase().slice(0, 100)
    const allowed = value.intent === 'business-card' ? IMAGE_TYPES : value.intent === 'audio' ? AUDIO_TYPES : DOCUMENT_TYPES
    if (!allowed.has(mimeType)) throw requestError('지원하지 않는 첨부 파일 형식입니다.', 415)

    input.intent = value.intent
    input.attachment = { name: cleanFilename(attachment.name), mimeType, size, ...(storagePath ? { storagePath } : { data }) }
  }

  return input
}

function policyInteger(value, fallback, minimum = 1, maximum = 30) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback
}

export function pointsForRequest(input = {}, policy = DEFAULT_AI_POINT_POLICY) {
  const costs = policy?.requestCosts ?? DEFAULT_AI_POINT_POLICY.requestCosts
  if (input.action === 'interpret-request') return policyInteger(costs.interpretRequest, 1)
  if (input.action !== 'analyze-attachment') {
    const fallback = input.responseStyle === 'detailed' ? 4 : 1
    return policyInteger(costs.chat?.[input.responseStyle] ?? costs.chat?.concise, fallback)
  }

  const bytes = attachmentBytes(input.attachment)
  const attachment = costs.attachment ?? DEFAULT_AI_POINT_POLICY.requestCosts.attachment
  const maximum = policyInteger(attachment.maximum, 30)
  if (input.intent === 'business-card') return policyInteger(attachment.businessCard, 5, 1, maximum)
  if (input.intent === 'audio') {
    const base = policyInteger(attachment.audioBase, 5, 1, maximum)
    const perMiB = policyInteger(attachment.audioPerMiB, 4, 1, maximum)
    return Math.min(maximum, base + Math.ceil(bytes / MEBIBYTE) * perMiB)
  }
  const base = policyInteger(attachment.documentBase, 5, 1, maximum)
  const perMiB = policyInteger(attachment.documentPerMiB, 5, 1, maximum)
  return Math.min(maximum, base + Math.ceil(bytes / MEBIBYTE) * perMiB)
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
