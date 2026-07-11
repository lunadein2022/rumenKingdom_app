import { supabase } from '../lib/supabase'
import type { SourceAttachment } from '../types'

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

async function authHeaders() {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } }
  const accessToken = data.session?.access_token
  if (!accessToken) throw new Error('리타와 대화하려면 왕국 계정 로그인이 필요합니다.')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }
}

export async function askRita(messages: RitaMessage[]): Promise<string> {
  const response = await fetch('/.netlify/functions/claude', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ action: 'chat', messages }),
  })

  const payload = await response.json() as { reply?: string; error?: string }
  if (!response.ok || !payload.reply) throw new Error(payload.error ?? '리타와 연결할 수 없습니다.')
  return payload.reply
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

  const payload = await response.json() as { analysis?: RitaAttachmentAnalysis; error?: string }
  if (!response.ok || !payload.analysis) throw new Error(payload.error ?? '첨부 파일을 분석하지 못했습니다.')
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
