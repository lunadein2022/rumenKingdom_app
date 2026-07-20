import { supabase } from '../lib/supabase'
import type { SourceAttachment } from '../types'
import type { CalendarKind, QuestPriority, QuestType } from '../types'
import { readAccountStorage } from '../lib/accountScope'
import { currentServiceTimePreferences } from '../lib/serviceTime'

export interface RitaMessage {
  role: 'user' | 'assistant'
  content: string
}

export type AttachmentIntent = 'business-card' | 'document' | 'audio'

export interface BusinessCardAnalysis {
  kind: 'business-card'
  name: string
  organization: string
  position: string
  phone: string
  email: string
  address: string
  social: string
  memo: string
  tags: string[]
  ocrText: string
  attachment: SourceAttachment
}

export interface MemorandumAnalysis {
  kind: 'memorandum'
  title: string
  summary: string
  tags: string[]
  transcript?: string
  attachment: SourceAttachment
}

export type RitaAttachmentAnalysis = BusinessCardAnalysis | MemorandumAnalysis

export type RitaRequestAnalysis =
  | { kind: 'chat'; reply: string }
  | { kind: 'clarify'; reply: string }
  | { kind: 'memo'; title: string; content: string; tags: string[] }
  | { kind: 'relationship'; name: string; organization: string; position: string; phone: string; email: string; address: string; social: string; memo: string; tags: string[]; groupIds?: string[]; reply: string }
  | { kind: 'project'; title: string; goal: string; description: string; startDate?: string; dueDate?: string; priority: QuestPriority; tags: string[]; reply: string }
  | { kind: 'quest'; title: string; description: string; questType: QuestType; dueDate?: string; dueTime?: string; priority: QuestPriority; tags: string[]; projectId?: string; needsProjectSelection: boolean; reply: string }
  | { kind: 'calendar'; title: string; description: string; startDate: string; endDate?: string; startTime?: string; endTime?: string; allDay: boolean; calendarKind: CalendarKind; important: boolean; reply: string }

export interface RitaProjectContext {
  id: string
  title: string
  status: string
}

export interface RitaUsage {
  tier: 'free' | 'royal' | 'royal_ai'
  monthlyLimit: number
  monthlyUsed: number
  monthlyRemaining: number
  bonusRemaining: number
  totalRemaining: number
}

export interface RitaUsageActivity {
  id: string
  requestType: string
  model?: string
  points: number
  status: 'reserved' | 'consumed' | 'released'
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
  createdAt: string
  completedAt?: string
}

export interface RitaGiftActivity {
  id: string
  benefitType: 'ai_points' | 'cosmetic' | 'all_access'
  benefitKey: string
  amount: number
  expiresAt?: string
  reason: string
  createdAt: string
}

export interface RitaActivity {
  usage: RitaUsageActivity[]
  gifts: RitaGiftActivity[]
}

function responseStyle() {
  const value = readAccountStorage('rumen-rita-style')
  return value === 'warm' || value === 'detailed' ? value : 'concise'
}

/** 응답을 JSON으로 파싱한다. 서버가 HTML(예: SPA fallback)을 돌려주면 원인을 알려주는 오류를 던진다. */
async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('리타 서버(Netlify 함수)에 연결하지 못했어요. 로컬 실행 중이라면 `netlify dev`로 띄우고, 배포 환경이라면 Netlify 함수 배포와 환경 변수(ANTHROPIC_API_KEY 등)를 확인해 주세요.')
  }
}

async function authHeaders() {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } }
  const accessToken = data.session?.access_token
  if (!accessToken) throw new Error('리타와 대화하려면 왕국 계정 로그인이 필요합니다.')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }
}

export async function getRitaUsage(): Promise<RitaUsage> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.')
  const { data, error } = await supabase.rpc('get_my_ai_usage')
  if (error) throw new Error('리타 AI 사용량을 불러오지 못했습니다.')
  return data as RitaUsage
}

export async function getRitaActivity(): Promise<RitaActivity> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.')
  const { data, error } = await supabase.rpc('get_my_ai_activity', { p_limit: 100 })
  if (error) throw new Error('리타 AI 이용 기록을 불러오지 못했습니다.')
  return data as RitaActivity
}

function signalUsageChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('rumen-ai-usage-changed'))
}

export async function askRita(messages: RitaMessage[]): Promise<string> {
  const response = await fetch('/.netlify/functions/claude', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ action: 'chat', messages, responseStyle: responseStyle() }),
  })

  const payload = await readJson<{ reply?: string; error?: string }>(response)
  if (!response.ok || !payload.reply) throw new Error(payload.error ?? '리타와 연결할 수 없습니다.')
  signalUsageChanged()
  return payload.reply
}

export async function interpretRitaRequest(messages: RitaMessage[], projects: RitaProjectContext[]): Promise<RitaRequestAnalysis> {
  const { timeZone } = currentServiceTimePreferences()
  const response = await fetch('/.netlify/functions/claude', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      action: 'interpret-request',
      messages,
      projects,
      now: new Date().toISOString(),
      timeZone,
      responseStyle: responseStyle(),
    }),
  })

  const payload = await readJson<{ analysis?: RitaRequestAnalysis; error?: string }>(response)
  if (!response.ok || !payload.analysis) throw new Error(payload.error ?? '리타가 요청을 정리하지 못했습니다.')
  signalUsageChanged()
  return payload.analysis
}

export async function analyzeRitaAttachment(file: File, intent: AttachmentIntent): Promise<RitaAttachmentAnalysis> {
  if (file.size > 4 * 1024 * 1024) throw new Error('현재 첨부 파일은 4MB 이하만 분석할 수 있어요.')
  const response = await fetch('/.netlify/functions/claude', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      action: 'analyze-attachment',
      intent,
      attachment: {
        name: file.name,
        mimeType: file.type || fallbackMimeType(file.name),
        size: file.size,
        data: await fileToBase64(file),
      },
    }),
  })

  const payload = await readJson<{ analysis?: RitaAttachmentAnalysis; error?: string }>(response)
  if (!response.ok || !payload.analysis) throw new Error(payload.error ?? '첨부 파일을 분석하지 못했습니다.')
  signalUsageChanged()
  const storagePath = await uploadOriginalAttachment(file).catch(() => undefined)
  return { ...payload.analysis, attachment: { ...payload.analysis.attachment, storagePath } }
}

async function uploadOriginalAttachment(file: File) {
  if (!supabase) return undefined
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return undefined
  const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-100) || 'attachment'
  const path = `${auth.user.id}/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from('rita-attachments').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(file)
  })
}

function fallbackMimeType(name: string) {
  const extension = name.split('.').pop()?.toLowerCase()
  return extension === 'pdf' ? 'application/pdf'
    : extension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : extension === 'csv' ? 'text/csv'
        : extension === 'md' ? 'text/markdown'
          : 'text/plain'
}
