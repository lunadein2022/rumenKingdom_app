import { createClient } from '@supabase/supabase-js'
import { createHmac, randomUUID } from 'node:crypto'
import mammoth from 'mammoth'
import JSZip from 'jszip'
import { HwpxReader, hwpToText } from '@ssabrojs/hwpxjs'
import {
  estimateClaudeCostUsd,
  MAX_AI_REQUEST_BYTES,
  MAX_ATTACHMENT_BYTES,
  modelForRequest,
  pointsForRequest,
  validateAiInput,
} from './ai-policy.js'

const SYSTEM_PROMPT = `당신은 루멘왕국의 왕실 메이드이자 일정·프로젝트 비서인 리타입니다.
사용자를 항상 공주님이라고 부르세요. 친근한 한국어 존댓말로 실제 대화를 나누듯 답하세요.
말투는 부드럽고 차분하며 다정해야 하고, 왕실 비서다운 신뢰감과 가벼운 생동감이 있어야 합니다.
공문·보고서·고객센터 같은 딱딱한 문체와 "요청을 분석한 결과", "확인되었습니다", "처리하겠습니다" 같은 상투적인 표현은 피하세요.
정보가 불분명하거나 중요한 정보가 빠졌다면 실행을 단정하지 말고 짧게 질문하세요.
실제 저장 결과를 받기 전에는 절대로 "추가했습니다", "저장했습니다"라고 말하지 마세요.
답변은 기본적으로 한국어로 1~3개의 자연스러운 문장으로 작성하세요.`

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const TEXT_TYPES = new Set(['text/plain', 'text/markdown', 'text/csv'])
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const HWP_TYPES = new Set(['application/x-hwp', 'application/haansofthwp'])
const HWPX_TYPES = new Set(['application/vnd.hancom.hwpx', 'application/hwp+zip'])
let pointPolicyCache = { value: null, expiresAt: 0 }

const responseStylePrompt = (value) => value === 'warm'
  ? '공주님의 감정을 먼저 짧게 헤아리고, 리타답게 다정하고 자연스럽게 답하되 핵심은 분명하게 전달하세요.'
  : value === 'detailed'
    ? '리타의 친근한 대화체를 유지하면서 필요한 배경과 다음 행동을 포함해 자세히 작성하세요.'
    : '짧더라도 명령문이나 보고서처럼 딱딱해지지 않게, 리타의 친근한 대화체로 핵심만 답하세요.'

const REQUEST_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['project', 'quest', 'calendar', 'relationship', 'memo', 'clarify', 'chat'] },
    title: { type: 'string' },
    goal: { type: 'string' },
    description: { type: 'string' },
    name: { type: 'string' },
    organization: { type: 'string' },
    position: { type: 'string' },
    phone: { type: 'string' },
    email: { type: 'string' },
    address: { type: 'string' },
    social: { type: 'string' },
    memo: { type: 'string' },
    content: { type: 'string' },
    reply: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    dueDate: { type: 'string' },
    startTime: { type: 'string' },
    endTime: { type: 'string' },
    dueTime: { type: 'string' },
    priority: { type: 'string', enum: ['high', 'medium', 'low'] },
    questType: { type: 'string', enum: ['daily', 'sub'] },
    projectId: { type: 'string' },
    calendarKind: { type: 'string', enum: ['royal', 'personal', 'work', 'project', 'anniversary'] },
    tags: { type: 'array', items: { type: 'string' } },
    allDay: { type: 'boolean' },
    important: { type: 'boolean' },
    needsProjectSelection: { type: 'boolean' },
  },
  required: [
    'kind', 'title', 'goal', 'description', 'name', 'organization', 'position', 'phone', 'email', 'address',
    'social', 'memo', 'content', 'reply', 'startDate', 'endDate', 'dueDate', 'startTime', 'endTime', 'dueTime',
    'priority', 'questType', 'projectId', 'calendarKind', 'tags', 'allDay', 'important', 'needsProjectSelection',
  ],
  additionalProperties: false,
}

const json = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  body: JSON.stringify(body),
})

// Netlify applies this before invoking the function, so unauthenticated floods
// are limited without consuming a Supabase authentication request.
export const config = {
  path: '/.netlify/functions/claude',
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip'] },
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const contentType = String(event.headers['content-type'] ?? event.headers['Content-Type'] ?? '').toLowerCase()
  if (!contentType.includes('application/json')) return json(415, { error: 'Content-Type은 application/json이어야 합니다.' })
  const rawBody = event.isBase64Encoded
    ? Buffer.from(String(event.body ?? ''), 'base64').toString('utf8')
    : String(event.body ?? '')
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_AI_REQUEST_BYTES) {
    return json(413, { error: 'AI 요청 본문이 허용 크기를 초과했습니다.' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  const fallbackModel = process.env.CLAUDE_MODEL
  const models = {
    haiku: process.env.CLAUDE_HAIKU_MODEL || fallbackModel,
    sonnet: process.env.CLAUDE_SONNET_MODEL || fallbackModel,
  }
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const rateLimitSecret = process.env.AI_RATE_LIMIT_HMAC_SECRET
  if (!apiKey) return json(503, { error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' })
  if (!models.haiku || !models.sonnet) return json(503, { error: 'Claude 모델 환경 변수가 설정되지 않았습니다.' })
  if (!supabaseUrl || !supabaseAnonKey) return json(503, { error: 'Supabase 인증 환경 변수가 설정되지 않았습니다.' })
  if (!supabaseServiceRoleKey || !rateLimitSecret || Buffer.byteLength(rateLimitSecret, 'utf8') < 32) {
    return json(503, { error: 'AI 서버 보안 환경 변수가 설정되지 않았습니다.' })
  }

  const authorization = event.headers.authorization ?? event.headers.Authorization
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
  if (!token) return json(401, { error: '로그인이 필요합니다.' })

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) return json(401, { error: '로그인 세션이 유효하지 않습니다.' })

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const userId = authData.user.id
  const ipHash = hashClientIp(event, rateLimitSecret)
  const { error: rateLimitError } = await serviceClient.rpc('check_ai_rate_limit', {
    p_user_id: userId,
    p_ip_hash: ipHash,
  })
  if (rateLimitError) {
    const error = aiControlError(rateLimitError)
    return json(error.statusCode, { error: error.message })
  }

  let requestId
  let reserved = false
  try {
    let parsed
    try { parsed = JSON.parse(rawBody) } catch {
      throw Object.assign(new Error('올바른 JSON 요청이 필요합니다.'), { statusCode: 400 })
    }
    const input = validateAiInput(parsed)
    requestId = randomUUID()
    const model = modelForRequest(input, models)
    const points = pointsForRequest(input, await loadPointPolicy(serviceClient))
    const requestType = input.action === 'analyze-attachment'
      ? `attachment:${String(input.intent || 'document')}`
      : String(input.action || 'chat')
    const { data: allowance, error: reserveError } = await serviceClient.rpc('reserve_ai_usage', {
      p_user_id: userId,
      p_request_id: requestId,
      p_request_type: requestType,
      p_points: points,
    })
    if (reserveError) throw aiControlError(reserveError)
    reserved = true

    const metering = { claudeUsage: null, openAiUsage: null }
    let response
    if (input.action === 'analyze-attachment') response = await analyzeAttachment(input, apiKey, model, metering, serviceClient, userId)
    else if (input.action === 'interpret-request') response = await interpretRequest(input, apiKey, model, metering)
    else response = await chat(input, apiKey, model, metering)

    if (response.statusCode >= 400) {
      await releaseReservation(serviceClient, userId, requestId, `http_${response.statusCode}`)
      reserved = false
      return response
    }

    const usage = metering.claudeUsage ?? {}
    const estimatedCostUsd = estimateClaudeCostUsd(model, usage)
    const { error: finalizeError } = await serviceClient.rpc('finalize_ai_usage', {
      p_user_id: userId,
      p_request_id: requestId,
      p_model: model,
      p_input_tokens: usage.input_tokens ?? 0,
      p_output_tokens: usage.output_tokens ?? 0,
      p_cache_write_tokens: usage.cache_creation_input_tokens ?? 0,
      p_cache_read_tokens: usage.cache_read_input_tokens ?? 0,
      p_estimated_cost_usd: estimatedCostUsd,
      p_metadata: {
        action: input.action || 'chat',
        intent: input.intent || null,
        responseStyle: input.responseStyle || null,
        openAiUsage: metering.openAiUsage,
        transcriptionModel: input.intent === 'audio' ? (process.env.TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe') : null,
      },
    })
    if (finalizeError) console.error('Failed to finalize AI usage', requestId, finalizeError.message)
    reserved = false

    return {
      ...response,
      headers: {
        ...response.headers,
        'X-Rita-Points-Charged': String(points),
        'X-Rita-Points-Remaining': String(allowance?.totalRemaining ?? ''),
      },
    }
  } catch (error) {
    if (reserved && requestId) await releaseReservation(serviceClient, userId, requestId, safeFailureCode(error))
    console.error('Claude function error', error)
    const requestedStatus = Number(error?.statusCode)
    const statusCode = Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus <= 599 ? requestedStatus : 500
    return json(statusCode, { error: error instanceof Error ? error.message : '요청을 처리하지 못했습니다.' })
  }
}

async function loadPointPolicy(client) {
  if (pointPolicyCache.value && pointPolicyCache.expiresAt > Date.now()) return pointPolicyCache.value
  const { data, error } = await client.from('app_runtime_config')
    .select('ai_point_policy')
    .eq('environment', 'production')
    .maybeSingle()
  if (error) console.warn('Failed to load live AI point policy; using safe defaults', error.message)
  const value = data?.ai_point_policy ?? undefined
  pointPolicyCache = { value, expiresAt: Date.now() + 30_000 }
  return value
}

function aiControlError(error) {
  const message = String(error?.message ?? '')
  if (message.includes('AI_RATE_')) {
    return Object.assign(new Error('리타 AI 요청이 너무 많아요. 잠시 후 다시 이용해 주세요.'), { statusCode: 429 })
  }
  if (message.includes('AI_DAILY_REQUEST_LIMIT_REACHED')) {
    return Object.assign(new Error('오늘의 리타 AI 요청 한도에 도달했어요. 내일 다시 이용해 주세요.'), { statusCode: 429 })
  }
  if (message.includes('AI_MONTHLY_POINTS_EXHAUSTED')) {
    return Object.assign(new Error('이번 달 리타 AI 포인트를 모두 사용했어요.'), { statusCode: 429 })
  }
  console.error('AI allowance RPC error', error)
  return Object.assign(new Error('AI 사용량을 확인할 수 없어 요청을 안전하게 중단했어요.'), { statusCode: 503 })
}

function hashClientIp(event, secret) {
  const headers = event.headers ?? {}
  const forwarded = String(headers['x-forwarded-for'] ?? headers['X-Forwarded-For'] ?? '').split(',')[0]
  const ip = String(headers['x-nf-client-connection-ip'] ?? headers['X-Nf-Client-Connection-Ip'] ?? forwarded ?? 'unknown').trim() || 'unknown'
  return createHmac('sha256', secret).update(ip).digest('hex')
}

async function releaseReservation(client, userId, requestId, reason) {
  const { error } = await client.rpc('release_ai_usage', { p_user_id: userId, p_request_id: requestId, p_reason: reason })
  if (error) console.error('Failed to release AI usage', requestId, error.message)
}

function safeFailureCode(error) {
  const value = String(error?.code || 'request_failed').toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 80)
  return value || 'request_failed'
}

async function interpretRequest(input, apiKey, model, metering) {
  const messages = Array.isArray(input.messages)
    ? input.messages.filter((message) => message?.role === 'user' || message?.role === 'assistant').slice(-8)
      .map((message) => ({ role: message.role, content: String(message.content).slice(0, 4000) }))
    : []
  if (!messages.length) return json(400, { error: '분석할 요청이 필요합니다.' })

  const projects = Array.isArray(input.projects) ? input.projects.slice(0, 30).map((project) => ({
    id: String(project?.id ?? ''), title: String(project?.title ?? '').slice(0, 120), status: String(project?.status ?? ''),
  })).filter((project) => project.id && project.title) : []
  const now = String(input.now ?? new Date().toISOString())
  const timeZone = String(input.timeZone ?? 'Asia/Seoul')
  const instruction = `다음 대화의 마지막 사용자 요청을 분석하세요.
현재 시각: ${now}
시간대: ${timeZone}
현재 메인퀘스트 후보: ${JSON.stringify(projects)}

분류 규칙:
- project: 공주님이 새로운 메인퀘스트(프로젝트)를 만들려는 경우입니다. 여러 퀘스트를 담는 상위 목표·이니셔티브이며, 보통 "메인퀘스트" 또는 "프로젝트"를 새로 만들거나 시작해 달라고 요청합니다. 개별 실행 과업은 project가 아니라 quest입니다.
- quest: 사용자가 직접 해야 하는 행동이나 과업. 전화하기, 작성하기, 제출하기, 확인하기 등. 날짜나 시간이 있어도 행동 중심이면 퀘스트입니다.
- calendar: 특정 시각이나 기간에 발생하는 회의, 약속, 행사, 여행, 출장, 예약입니다.
- relationship: 사람·인물의 연락처나 명함 정보를 인연록에 저장하려는 경우입니다. "인연록에 저장해줘", "이 사람 저장해줘", "○○님 연락처 기록해줘", "명함 정리해줘"처럼 특정 인물의 이름·소속·직함·전화·이메일 등을 등록하려는 요청입니다.
- memo: 실행이나 일정 등록이 아닌 보관할 정보입니다. 특정 인물을 인연록에 등록하려는 의도가 아니면 memo입니다.
- chat: 저장 의도가 없는 일반 대화입니다.
- clarify: quest와 calendar 중 어느 것인지 모호하거나 일정에 필수 날짜가 없습니다.

"브랜드 리뉴얼 메인퀘스트 만들어줘"나 "새 프로젝트 시작하자, 이름은 왕국 도서관"은 project입니다. 반대로 "그 프로젝트에 발표자료 준비를 추가해줘"처럼 기존 메인퀘스트에 실행 항목을 넣는 것은 quest이고 projectId를 채웁니다.
"내일 거래처에 전화해야 해"는 quest이고 "내일 오후 3시에 거래처 회의가 있어"는 calendar입니다.
"8월 19일부터 22일까지 가족여행"은 calendar이며 시간이 없으면 allDay=true입니다.
사용자가 "개인업무 일정"이라고 말하면 calendarKind는 personal로 분류하세요. 업무·회사 일정은 work, 프로젝트 마감은 project입니다.
퀘스트가 메인퀘스트 연결을 요구하면 후보의 정확한 id만 projectId로 반환하세요. 일부 이름, 설명 또는 직전 대화로 하나를 확정할 수 없으면 projectId를 비우고 needsProjectSelection=true로 두세요.
연도가 생략된 날짜는 현재 시각 기준 가장 가까운 미래 날짜를 YYYY-MM-DD로 계산하세요.
저장을 완료했다고 말하지 말고 초안을 확인해 달라는 reply를 작성하세요.

모든 필드를 반환하세요. 현재 kind에서 사용하지 않는 문자열은 빈 문자열, tags는 빈 배열, 불리언은 false로 두세요.
사용하지 않는 enum 필드는 priority=medium, questType=daily, calendarKind=personal로 두세요.

출력은 제공된 JSON 스키마를 정확히 따르세요. 마크다운이나 JSON 밖의 문장은 사용하지 마세요.`

  const result = await callClaude(apiKey, model, {
    system: `${SYSTEM_PROMPT}\n${responseStylePrompt(input.responseStyle)}\n\n${instruction}`,
    max_tokens: 1200,
    output_config: { format: { type: 'json_schema', schema: REQUEST_ANALYSIS_SCHEMA } },
    messages,
  }, metering)
  const parsed = parseClaudeJson(textFromClaude(result))
  return json(200, { analysis: normalizeRequestAnalysis(parsed, projects) })
}

function normalizeRequestAnalysis(value, projects) {
  const kind = clean(value?.kind)
  if (kind === 'project') {
    return {
      kind: 'project', title: clean(value.title), goal: clean(value.goal), description: clean(value.description),
      startDate: isoDate(value.startDate), dueDate: isoDate(value.dueDate),
      priority: ['high', 'low'].includes(value.priority) ? value.priority : 'medium', tags: stringArray(value.tags),
      reply: clean(value.reply) || '메인퀘스트 초안을 정리했어요. 저장하기 전에 확인해 주세요.',
    }
  }
  if (kind === 'quest') {
    const projectId = projects.some((project) => project.id === value.projectId) ? value.projectId : ''
    return {
      kind: 'quest', title: clean(value.title), description: clean(value.description),
      questType: value.questType === 'sub' ? 'sub' : 'daily', dueDate: isoDate(value.dueDate), dueTime: clockTime(value.dueTime),
      priority: ['high', 'low'].includes(value.priority) ? value.priority : 'medium', tags: stringArray(value.tags),
      projectId: projectId || undefined, needsProjectSelection: Boolean(value.needsProjectSelection) && !projectId,
      reply: clean(value.reply) || '퀘스트 초안을 정리했어요. 저장하기 전에 확인해 주세요.',
    }
  }
  if (kind === 'calendar') {
    const startDate = isoDate(value.startDate)
    const endDate = isoDate(value.endDate)
    if (!startDate) return { kind: 'clarify', reply: '일정을 어느 날짜에 등록할까요?' }
    if (endDate && endDate < startDate) return { kind: 'clarify', reply: '종료일이 시작일보다 빠릅니다. 일정 기간을 다시 알려주시겠어요?' }
    const calendarKinds = ['royal', 'personal', 'work', 'project', 'anniversary']
    return {
      kind: 'calendar', title: clean(value.title), description: clean(value.description), startDate,
      endDate: endDate || undefined, startTime: clockTime(value.startTime), endTime: clockTime(value.endTime),
      allDay: Boolean(value.allDay) || !clockTime(value.startTime),
      calendarKind: calendarKinds.includes(value.calendarKind) ? value.calendarKind : 'personal',
      important: Boolean(value.important), reply: clean(value.reply) || '일정 초안을 정리했어요. 저장하기 전에 확인해 주세요.',
    }
  }
  if (kind === 'relationship') {
    return {
      kind: 'relationship', name: clean(value.name), organization: clean(value.organization), position: clean(value.position),
      phone: clean(value.phone), email: clean(value.email), address: clean(value.address), social: clean(value.social),
      memo: clean(value.memo), tags: stringArray(value.tags),
      reply: clean(value.reply) || '인연록 초안을 정리했어요. 저장하기 전에 확인해 주세요.',
    }
  }
  if (kind === 'memo') return { kind: 'memo', title: clean(value.title), content: clean(value.content), tags: stringArray(value.tags) }
  if (kind === 'clarify') return { kind: 'clarify', reply: clean(value.reply) || '퀘스트와 일정 중 어느 것으로 등록할까요?' }
  return { kind: 'chat', reply: clean(value?.reply) || '공주님, 조금 더 자세히 말씀해 주시겠어요?' }
}

const isoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(clean(value)) ? clean(value) : undefined
const clockTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(clean(value)) ? clean(value) : undefined

async function chat(input, apiKey, model, metering) {
  const messages = Array.isArray(input.messages)
    ? input.messages.filter((message) => message?.role === 'user' || message?.role === 'assistant').slice(-8)
      .map((message) => ({ role: message.role, content: String(message.content).slice(0, 4000) }))
    : []
  if (!messages.length) return json(400, { error: '대화 내용이 필요합니다.' })
  const result = await callClaude(apiKey, model, { system: `${SYSTEM_PROMPT}\n${responseStylePrompt(input.responseStyle)}`, messages, max_tokens: input.responseStyle === 'detailed' ? 1000 : 600 }, metering)
  const reply = textFromClaude(result)
  return reply ? json(200, { reply }) : json(502, { error: '리타의 응답이 비어 있습니다.' })
}

async function analyzeAttachment(input, apiKey, model, metering, serviceClient, userId) {
  const attachment = input.attachment ?? {}
  const mimeType = String(attachment.mimeType ?? '').toLowerCase()
  const storagePath = String(attachment.storagePath ?? '')
  let bytes
  if (storagePath) {
    const expectedPrefix = `${userId}/temporary/`
    if (!storagePath.startsWith(expectedPrefix)) return json(403, { error: '본인의 임시 첨부 파일만 분석할 수 있습니다.' })
    const { data: storedFile, error } = await serviceClient.storage.from('rita-attachments').download(storagePath)
    if (error || !storedFile) return json(404, { error: '첨부 파일을 읽지 못했어요. 다시 첨부해 주세요.' })
    bytes = Buffer.from(await storedFile.arrayBuffer())
  } else {
    bytes = Buffer.from(String(attachment.data ?? ''), 'base64')
  }
  const data = bytes.toString('base64')
  const metadata = { name: String(attachment.name ?? 'attachment'), mimeType, size: bytes.length }
  if (!bytes.length) return json(400, { error: '첨부 파일이 비어 있습니다.' })
  if (bytes.length > MAX_ATTACHMENT_BYTES) return json(413, { error: '첨부 파일은 최대 25MB까지 분석할 수 있어요.' })

  try {

  await validateAttachmentContent(bytes, metadata, input.intent)

  if (input.intent === 'business-card') {
    if (!IMAGE_TYPES.has(mimeType)) return json(415, { error: '명함은 JPG, PNG, GIF, WebP 이미지로 첨부해 주세요.' })
    const result = await callClaude(apiKey, model, {
      system: SYSTEM_PROMPT,
      max_tokens: 1200,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data } },
        { type: 'text', text: `이 이미지를 명함으로 읽으세요. 보이는 정보만 사용하고 추측하지 마세요.
반드시 JSON 하나만 반환하세요: {"name":"","organization":"","position":"","phone":"","email":"","address":"","social":"","memo":"","tags":[],"ocrText":""}.
명함이 아니거나 이름을 식별할 수 없으면 name을 빈 문자열로 두세요. tags는 최대 5개 한국어 키워드입니다.` },
      ] }],
    }, metering)
    const parsed = parseClaudeJson(textFromClaude(result))
    if (!parsed.name) return json(422, { error: '명함으로 인식하지 못했어요. 글자가 선명하게 보이도록 다시 촬영해 주세요.' })
    return json(200, { analysis: {
      kind: 'business-card', name: clean(parsed.name), organization: clean(parsed.organization), position: clean(parsed.position),
      phone: clean(parsed.phone), email: clean(parsed.email), address: clean(parsed.address), social: clean(parsed.social),
      memo: clean(parsed.memo), tags: stringArray(parsed.tags), ocrText: clean(parsed.ocrText), attachment: metadata,
    } })
  }

  if (input.intent === 'audio') {
    const transcript = await transcribeAudio(bytes, metadata, process.env.OPENAI_API_KEY, metering)
    const summary = await summarizeText(apiKey, model, transcript, `음성 기록 ${metadata.name}`, metering)
    return json(200, { analysis: { kind: 'memorandum', ...summary, transcript, attachment: metadata } })
  }

  let content
  if (mimeType === 'application/pdf') {
    content = [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } },
      { type: 'text', text: memorandumPrompt(metadata.name) }]
  } else {
    const text = await extractDocumentText(bytes, metadata)
    if ((HWP_TYPES.has(mimeType) || HWPX_TYPES.has(mimeType) || /\.hwpx?$/i.test(metadata.name)) && text.length > 600000) {
      throw Object.assign(new Error('HWP·HWPX는 200쪽 이하의 문서만 분석할 수 있어요.'), { statusCode: 413 })
    }
    content = `${memorandumPrompt(metadata.name)}\n\n<document>\n${text.slice(0, 60000)}\n</document>`
  }
  const result = await callClaude(apiKey, model, { system: SYSTEM_PROMPT, max_tokens: 1000, messages: [{ role: 'user', content }] }, metering)
  const parsed = parseClaudeJson(textFromClaude(result))
  return json(200, { analysis: { kind: 'memorandum', ...normalizeMemorandum(parsed, metadata.name), attachment: metadata } })
  } finally {
    if (storagePath) {
      const { error } = await serviceClient.storage.from('rita-attachments').remove([storagePath])
      if (error) console.warn('Failed to remove temporary Rita attachment', error.message)
    }
  }
}

async function extractDocumentText(bytes, metadata) {
  const mimeType = metadata.mimeType
  const extension = metadata.name.split('.').pop()?.toLowerCase()
  if (TEXT_TYPES.has(mimeType)) return bytes.toString('utf8')
  if (mimeType === DOCX_TYPE) {
    const result = await mammoth.extractRawText({ buffer: bytes })
    return result.value
  }
  try {
    if (HWP_TYPES.has(mimeType) || extension === 'hwp') return await hwpToText(new Uint8Array(bytes))
    if (HWPX_TYPES.has(mimeType) || extension === 'hwpx') {
      const reader = new HwpxReader()
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      await reader.loadFromArrayBuffer(buffer)
      return await reader.extractText()
    }
  } catch (error) {
    const detail = String(error?.message ?? '').toLowerCase()
    if (detail.includes('encrypt') || detail.includes('암호')) {
      throw Object.assign(new Error('암호·DRM·배포용으로 보호된 HWP/HWPX는 분석할 수 없어요. 보호를 풀고 다시 저장해 주세요.'), { statusCode: 422 })
    }
    throw Object.assign(new Error('HWP/HWPX 문서를 읽지 못했어요. HWP 5.x 또는 최신 HWPX 형식인지 확인해 주세요.'), { statusCode: 422 })
  }
  throw Object.assign(new Error('PDF, DOCX, HWP, HWPX, TXT, MD, CSV 문서만 지원합니다.'), { statusCode: 415 })
}

async function validateAttachmentContent(bytes, metadata, intent) {
  const mime = metadata.mimeType
  const extension = metadata.name.split('.').pop()?.toLowerCase()
  const starts = (...values) => values.every((value, index) => bytes[index] === value)
  const ascii = bytes.subarray(0, 16).toString('latin1')
  const zip = starts(0x50, 0x4b)
  const ole = starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)
  const image = starts(0xff, 0xd8, 0xff) || starts(0x89, 0x50, 0x4e, 0x47) || ascii.startsWith('GIF8') || ascii.startsWith('RIFF') && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  const audio = ascii.startsWith('ID3') || starts(0xff, 0xfb) || starts(0xff, 0xf3) || starts(0xff, 0xf2)
    || ascii.startsWith('RIFF') && bytes.subarray(8, 12).toString('ascii') === 'WAVE'
    || ascii.startsWith('OggS') || bytes.subarray(4, 12).toString('ascii').includes('ftyp') || starts(0x1a, 0x45, 0xdf, 0xa3)
  if (intent === 'business-card' && (!IMAGE_TYPES.has(mime) || !image)) throw Object.assign(new Error('이미지 형식과 실제 파일 내용이 일치하지 않아요.'), { statusCode: 415 })
  if (intent === 'audio') {
    if (!audio) throw Object.assign(new Error('음성 형식과 실제 파일 내용이 일치하지 않아요.'), { statusCode: 415 })
    const duration = estimateAudioDurationSeconds(bytes)
    if (duration && duration > 30 * 60 + 5) throw Object.assign(new Error('음성 파일은 30분 이하만 분석할 수 있어요.'), { statusCode: 413 })
  }
  if (mime === 'application/pdf' && !ascii.startsWith('%PDF-')) throw Object.assign(new Error('PDF 형식과 실제 파일 내용이 일치하지 않아요.'), { statusCode: 415 })
  if ((mime === DOCX_TYPE || HWPX_TYPES.has(mime) || extension === 'docx' || extension === 'hwpx') && !zip) throw Object.assign(new Error('압축 문서 형식이 올바르지 않아요.'), { statusCode: 415 })
  if ((HWP_TYPES.has(mime) || extension === 'hwp') && !ole) throw Object.assign(new Error('HWP 5.x 파일 형식이 아니거나 손상된 문서예요.'), { statusCode: 415 })
  if (TEXT_TYPES.has(mime)) {
    const sample = bytes.subarray(0, Math.min(bytes.length, 8192))
    const nulls = [...sample].filter((value) => value === 0).length
    if (sample.length && nulls / sample.length > 0.01) throw Object.assign(new Error('텍스트 파일로 확인할 수 없는 바이너리 내용이 들어 있어요.'), { statusCode: 415 })
  }
  if (zip) await validateArchiveLimits(bytes)
}

async function validateArchiveLimits(bytes) {
  let archive
  try { archive = await JSZip.loadAsync(bytes, { checkCRC32: false }) }
  catch { throw Object.assign(new Error('손상되었거나 지원하지 않는 압축 문서예요.'), { statusCode: 422 }) }
  const entries = Object.values(archive.files)
  if (entries.length > 2000) throw Object.assign(new Error('문서 내부 파일 수가 너무 많아요.'), { statusCode: 413 })
  const expanded = entries.reduce((sum, entry) => sum + Number(entry?._data?.uncompressedSize ?? 0), 0)
  if (expanded > 100 * 1024 * 1024 || expanded > bytes.length * 120) throw Object.assign(new Error('압축을 푼 문서 크기가 안전 한도를 넘어요.'), { statusCode: 413 })
}

function estimateAudioDurationSeconds(bytes) {
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.length >= 32) {
    const bytesPerSecond = bytes.readUInt32LE(28)
    return bytesPerSecond ? bytes.length / bytesPerSecond : 0
  }
  let offset = 0
  if (bytes.subarray(0, 3).toString('ascii') === 'ID3' && bytes.length >= 10) offset = 10 + ((bytes[6] & 0x7f) << 21) + ((bytes[7] & 0x7f) << 14) + ((bytes[8] & 0x7f) << 7) + (bytes[9] & 0x7f)
  for (; offset + 4 < Math.min(bytes.length, 1024 * 1024); offset += 1) {
    if (bytes[offset] !== 0xff || (bytes[offset + 1] & 0xe0) !== 0xe0) continue
    const version = (bytes[offset + 1] >> 3) & 0x03
    const layer = (bytes[offset + 1] >> 1) & 0x03
    const bitrateIndex = (bytes[offset + 2] >> 4) & 0x0f
    if (layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15) continue
    const mpeg1 = [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]
    const mpeg2 = [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160]
    const kbps = (version === 3 ? mpeg1 : mpeg2)[bitrateIndex]
    return kbps ? bytes.length * 8 / (kbps * 1000) : 0
  }
  return 0
}

async function transcribeAudio(bytes, metadata, openAiKey, metering) {
  if (!openAiKey) throw Object.assign(new Error('음성 전사를 사용하려면 Netlify에 OPENAI_API_KEY를 설정해 주세요.'), { statusCode: 503 })
  const form = new FormData()
  form.append('model', process.env.TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe')
  form.append('language', 'ko')
  form.append('file', new Blob([bytes], { type: metadata.mimeType }), metadata.name)
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${openAiKey}` }, body: form })
  const result = await response.json()
  if (!response.ok || !result.text) throw Object.assign(new Error('음성 파일을 텍스트로 변환하지 못했습니다.'), { statusCode: 502 })
  metering.openAiUsage = result.usage ?? null
  return String(result.text).trim()
}

async function summarizeText(apiKey, model, text, fallbackTitle, metering) {
  const result = await callClaude(apiKey, model, { system: SYSTEM_PROMPT, max_tokens: 1000, messages: [{ role: 'user', content: `${memorandumPrompt(fallbackTitle)}\n\n<transcript>\n${text.slice(0, 60000)}\n</transcript>` }] }, metering)
  const parsed = parseClaudeJson(textFromClaude(result))
  return normalizeMemorandum(parsed, fallbackTitle)
}

function normalizeMemorandum(value, fallbackTitle) {
  return {
    title: clean(value.title) || fallbackTitle,
    summary: clean(value.summary),
    tags: stringArray(value.tags),
    keyPoints: stringArray(value.keyPoints),
    decisions: stringArray(value.decisions),
    actionItems: stringArray(value.actionItems),
    dates: stringArray(value.dates),
    people: stringArray(value.people),
  }
}

function memorandumPrompt(filename) {
  return `파일 ${filename}의 핵심을 한국어 비망록으로 정리하세요. 중요한 사실, 결정, 해야 할 일, 날짜와 인물을 빠뜨리지 마세요.
반드시 JSON 하나만 반환하세요: {"title":"짧은 제목","summary":"읽기 좋은 요약","tags":["최대 5개"],"keyPoints":[],"decisions":[],"actionItems":[],"dates":[],"people":[]}. 추측한 내용은 포함하지 마세요.`
}

async function callClaude(apiKey, model, body, metering, options = {}) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, ...body }),
  })
  const result = await response.json()
  if (!response.ok) {
    const providerType = String(result?.error?.type || `http_${response.status}`).toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 50)
    if (providerType === 'invalid_request_error' && body.output_config && !options.structuredFallbackUsed) {
      console.warn('Anthropic structured output unavailable; retrying with prompt-enforced JSON')
      const fallbackBody = { ...body }
      delete fallbackBody.output_config
      return callClaude(apiKey, model, fallbackBody, metering, { structuredFallbackUsed: true })
    }
    console.error('Anthropic API error', response.status, providerType)
    throw Object.assign(new Error('리타가 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'), {
      statusCode: 502,
      code: `anthropic_${providerType}`,
    })
  }
  metering.claudeUsage = addUsage(metering.claudeUsage, result.usage)
  return result
}

function addUsage(current = {}, next = {}) {
  const fields = ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens']
  return Object.fromEntries(fields.map((field) => [field, (Number(current?.[field]) || 0) + (Number(next?.[field]) || 0)]))
}

function textFromClaude(result) {
  return result?.content?.find((item) => item.type === 'text')?.text ?? ''
}

function parseClaudeJson(value) {
  const cleaned = String(value).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try { return JSON.parse(cleaned) } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    try {
      if (match) return JSON.parse(match[0])
    } catch {
      // Fall through to the sanitized error below.
    }
    throw Object.assign(new Error('리타의 분석 결과 형식을 읽지 못했어요. 다시 한번 말씀해 주세요.'), {
      statusCode: 502,
      code: 'invalid_structured_output',
    })
  }
}

const clean = (value) => typeof value === 'string' ? value.trim() : ''
const stringArray = (value) => Array.isArray(value) ? value.map(clean).filter(Boolean).slice(0, 5) : []
