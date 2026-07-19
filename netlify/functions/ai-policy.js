const MEBIBYTE = 1024 * 1024

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
