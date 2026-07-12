import { createClient } from '@supabase/supabase-js'
import mammoth from 'mammoth'

const SYSTEM_PROMPT = `당신은 루멘왕국의 왕실 메이드이자 일정·프로젝트 비서인 리타입니다.
사용자를 항상 공주님이라고 부르세요. 말투는 부드럽고 차분하며 신뢰감 있어야 합니다.
정보가 불분명하거나 중요한 정보가 빠졌다면 실행을 단정하지 말고 짧게 질문하세요.
실제 저장 결과를 받기 전에는 절대로 "추가했습니다", "저장했습니다"라고 말하지 마세요.
답변은 기본적으로 한국어로 간결하게 작성하세요.`

const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const TEXT_TYPES = new Set(['text/plain', 'text/markdown', 'text/csv'])
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
})

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  const model = process.env.CLAUDE_MODEL
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  if (!apiKey || !model) return json(503, { error: 'Claude 환경 변수가 설정되지 않았습니다.' })
  if (!supabaseUrl || !supabaseAnonKey) return json(503, { error: 'Supabase 인증 환경 변수가 설정되지 않았습니다.' })

  const authorization = event.headers.authorization ?? event.headers.Authorization
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
  if (!token) return json(401, { error: '로그인이 필요합니다.' })

  const authClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) return json(401, { error: '로그인 세션이 유효하지 않습니다.' })

  try {
    const input = JSON.parse(event.body ?? '{}')
    if (input.action === 'analyze-attachment') return await analyzeAttachment(input, apiKey, model)
    if (input.action === 'interpret-request') return await interpretRequest(input, apiKey, model)
    return await chat(input, apiKey, model)
  } catch (error) {
    console.error('Claude function error', error)
    return json(500, { error: error instanceof Error ? error.message : '요청을 처리하지 못했습니다.' })
  }
}

async function interpretRequest(input, apiKey, model) {
  const messages = Array.isArray(input.messages)
    ? input.messages.filter((message) => message?.role === 'user' || message?.role === 'assistant').slice(-12)
      .map((message) => ({ role: message.role, content: String(message.content).slice(0, 6000) }))
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
- quest: 사용자가 직접 해야 하는 행동이나 과업. 전화하기, 작성하기, 제출하기, 확인하기 등. 날짜나 시간이 있어도 행동 중심이면 퀘스트입니다.
- calendar: 특정 시각이나 기간에 발생하는 회의, 약속, 행사, 여행, 출장, 예약입니다.
- memo: 실행이나 일정 등록이 아닌 보관할 정보입니다.
- chat: 저장 의도가 없는 일반 대화입니다.
- clarify: quest와 calendar 중 어느 것인지 모호하거나 일정에 필수 날짜가 없습니다.

"내일 거래처에 전화해야 해"는 quest이고 "내일 오후 3시에 거래처 회의가 있어"는 calendar입니다.
"8월 19일부터 22일까지 가족여행"은 calendar이며 시간이 없으면 allDay=true입니다.
사용자가 "개인업무 일정"이라고 말하면 calendarKind는 personal로 분류하세요. 업무·회사 일정은 work, 프로젝트 마감은 project입니다.
퀘스트가 메인퀘스트 연결을 요구하면 후보의 정확한 id만 projectId로 반환하세요. 일부 이름, 설명 또는 직전 대화로 하나를 확정할 수 없으면 projectId를 비우고 needsProjectSelection=true로 두세요.
연도가 생략된 날짜는 현재 시각 기준 가장 가까운 미래 날짜를 YYYY-MM-DD로 계산하세요.
저장을 완료했다고 말하지 말고 초안을 확인해 달라는 reply를 작성하세요.

반드시 아래 중 하나의 JSON 객체만 출력하세요. 마크다운은 사용하지 마세요.
{"kind":"quest","title":"","description":"","questType":"daily|sub","dueDate":"YYYY-MM-DD 또는 빈 문자열","dueTime":"HH:mm 또는 빈 문자열","priority":"high|medium|low","tags":[],"projectId":"후보 id 또는 빈 문자열","needsProjectSelection":false,"reply":""}
{"kind":"calendar","title":"","description":"","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD 또는 빈 문자열","startTime":"HH:mm 또는 빈 문자열","endTime":"HH:mm 또는 빈 문자열","allDay":true,"calendarKind":"royal|personal|work|project|anniversary","important":false,"reply":""}
{"kind":"memo","title":"","content":"","tags":[]}
{"kind":"clarify","reply":"짧은 확인 질문"}
{"kind":"chat","reply":"일반 답변"}`

  const result = await callClaude(apiKey, model, {
    system: `${SYSTEM_PROMPT}\n\n${instruction}`,
    max_tokens: 1200,
    messages,
  })
  const parsed = parseClaudeJson(textFromClaude(result))
  return json(200, { analysis: normalizeRequestAnalysis(parsed, projects) })
}

function normalizeRequestAnalysis(value, projects) {
  const kind = clean(value?.kind)
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
  if (kind === 'memo') return { kind: 'memo', title: clean(value.title), content: clean(value.content), tags: stringArray(value.tags) }
  if (kind === 'clarify') return { kind: 'clarify', reply: clean(value.reply) || '퀘스트와 일정 중 어느 것으로 등록할까요?' }
  return { kind: 'chat', reply: clean(value?.reply) || '공주님, 조금 더 자세히 말씀해 주시겠어요?' }
}

const isoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(clean(value)) ? clean(value) : undefined
const clockTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(clean(value)) ? clean(value) : undefined

async function chat(input, apiKey, model) {
  const messages = Array.isArray(input.messages)
    ? input.messages.filter((message) => message?.role === 'user' || message?.role === 'assistant').slice(-20)
      .map((message) => ({ role: message.role, content: String(message.content).slice(0, 8000) }))
    : []
  if (!messages.length) return json(400, { error: '대화 내용이 필요합니다.' })
  const result = await callClaude(apiKey, model, { system: SYSTEM_PROMPT, messages, max_tokens: 900 })
  const reply = textFromClaude(result)
  return reply ? json(200, { reply }) : json(502, { error: '리타의 응답이 비어 있습니다.' })
}

async function analyzeAttachment(input, apiKey, model) {
  const attachment = input.attachment ?? {}
  const data = String(attachment.data ?? '')
  const bytes = Buffer.from(data, 'base64')
  const mimeType = String(attachment.mimeType ?? '').toLowerCase()
  const metadata = { name: String(attachment.name ?? 'attachment'), mimeType, size: Number(attachment.size ?? bytes.length) }
  if (!data || !bytes.length) return json(400, { error: '첨부 파일이 비어 있습니다.' })
  if (bytes.length > MAX_ATTACHMENT_BYTES) return json(413, { error: '현재 첨부 파일은 4MB 이하만 분석할 수 있습니다.' })

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
    })
    const parsed = parseClaudeJson(textFromClaude(result))
    if (!parsed.name) return json(422, { error: '명함으로 인식하지 못했어요. 글자가 선명하게 보이도록 다시 촬영해 주세요.' })
    return json(200, { analysis: {
      kind: 'business-card', name: clean(parsed.name), organization: clean(parsed.organization), position: clean(parsed.position),
      phone: clean(parsed.phone), email: clean(parsed.email), address: clean(parsed.address), social: clean(parsed.social),
      memo: clean(parsed.memo), tags: stringArray(parsed.tags), ocrText: clean(parsed.ocrText), attachment: metadata,
    } })
  }

  if (input.intent === 'audio') {
    const transcript = await transcribeAudio(bytes, metadata, process.env.OPENAI_API_KEY)
    const summary = await summarizeText(apiKey, model, transcript, `음성 기록 ${metadata.name}`)
    return json(200, { analysis: { kind: 'memorandum', ...summary, transcript, attachment: metadata } })
  }

  let content
  if (mimeType === 'application/pdf') {
    content = [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } },
      { type: 'text', text: memorandumPrompt(metadata.name) }]
  } else {
    const text = await extractDocumentText(bytes, mimeType)
    content = `${memorandumPrompt(metadata.name)}\n\n<document>\n${text.slice(0, 120000)}\n</document>`
  }
  const result = await callClaude(apiKey, model, { system: SYSTEM_PROMPT, max_tokens: 1400, messages: [{ role: 'user', content }] })
  const parsed = parseClaudeJson(textFromClaude(result))
  return json(200, { analysis: { kind: 'memorandum', title: clean(parsed.title) || metadata.name, summary: clean(parsed.summary), tags: stringArray(parsed.tags), attachment: metadata } })
}

async function extractDocumentText(bytes, mimeType) {
  if (TEXT_TYPES.has(mimeType)) return bytes.toString('utf8')
  if (mimeType === DOCX_TYPE) {
    const result = await mammoth.extractRawText({ buffer: bytes })
    return result.value
  }
  throw Object.assign(new Error('PDF, DOCX, TXT, MD, CSV 문서만 지원합니다.'), { statusCode: 415 })
}

async function transcribeAudio(bytes, metadata, openAiKey) {
  if (!openAiKey) throw new Error('음성 전사를 사용하려면 Netlify에 OPENAI_API_KEY를 설정해 주세요.')
  const form = new FormData()
  form.append('model', process.env.TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe')
  form.append('language', 'ko')
  form.append('file', new Blob([bytes], { type: metadata.mimeType }), metadata.name)
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${openAiKey}` }, body: form })
  const result = await response.json()
  if (!response.ok || !result.text) throw new Error('음성 파일을 텍스트로 변환하지 못했습니다.')
  return String(result.text).trim()
}

async function summarizeText(apiKey, model, text, fallbackTitle) {
  const result = await callClaude(apiKey, model, { system: SYSTEM_PROMPT, max_tokens: 1200, messages: [{ role: 'user', content: `${memorandumPrompt(fallbackTitle)}\n\n<transcript>\n${text.slice(0, 120000)}\n</transcript>` }] })
  const parsed = parseClaudeJson(textFromClaude(result))
  return { title: clean(parsed.title) || fallbackTitle, summary: clean(parsed.summary), tags: stringArray(parsed.tags) }
}

function memorandumPrompt(filename) {
  return `파일 ${filename}의 핵심을 한국어 비망록으로 정리하세요. 중요한 사실, 결정, 해야 할 일, 날짜와 인물을 빠뜨리지 마세요.
반드시 JSON 하나만 반환하세요: {"title":"짧은 제목","summary":"읽기 좋은 요약","tags":["최대 5개"]}. 추측한 내용은 포함하지 마세요.`
}

async function callClaude(apiKey, model, body) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, ...body }),
  })
  const result = await response.json()
  if (!response.ok) {
    console.error('Anthropic API error', response.status, result?.error?.type)
    throw new Error('리타가 파일을 분석하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }
  return result
}

function textFromClaude(result) {
  return result?.content?.find((item) => item.type === 'text')?.text ?? ''
}

function parseClaudeJson(value) {
  const cleaned = String(value).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try { return JSON.parse(cleaned) } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('리타의 분석 결과 형식을 읽지 못했습니다.')
    return JSON.parse(match[0])
  }
}

const clean = (value) => typeof value === 'string' ? value.trim() : ''
const stringArray = (value) => Array.isArray(value) ? value.map(clean).filter(Boolean).slice(0, 5) : []
