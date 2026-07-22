import { expandEventsBetween } from './recurrence'
import { serviceDate } from './serviceTime'
import type { CalendarEvent, DiaryEntry, Memo, Project, Quest, QuestCompletion, Relationship, RelationshipGroup } from '../types'
import type { RitaActivity } from '../services/ritaService'
import JSZip from 'jszip'
import { supabase } from './supabase'

export type ExportCategory = 'events' | 'projects' | 'dailyQuests' | 'subQuests' | 'questCompletions' | 'relationships' | 'relationshipGroups' | 'diaries' | 'memos' | 'ritaUsage' | 'gifts' | 'ritaConversation' | 'attachments'
export type ExportDataset = {
  events: CalendarEvent[]; projects: Project[]; quests: Quest[]; questCompletions: QuestCompletion[]; relationships: Relationship[];
  relationshipGroups: RelationshipGroup[]; diaries: DiaryEntry[]; memos: Memo[]; ritaActivity?: RitaActivity; ritaConversation?: unknown[]
}

const between = (value: string | undefined, from: string, to: string) => Boolean(value && value.slice(0, 10) >= from && value.slice(0, 10) <= to)
const overlap = (start: string | undefined, end: string | undefined, from: string, to: string) => (start ?? '0000-01-01') <= to && (end ?? '9999-12-31') >= from

export function buildExportSections(data: ExportDataset, categories: Set<ExportCategory>, from: string, to: string) {
  const sections: Record<string, unknown[]> = {}
  if (categories.has('events')) sections['왕실일정'] = expandEventsBetween(data.events, from, to)
  if (categories.has('projects')) sections['메인퀘스트'] = data.projects.filter((item) => overlap(item.startDate, item.due, from, to))
  if (categories.has('dailyQuests')) sections['일일퀘스트'] = data.quests.filter((item) => item.type === 'daily' && overlap(serviceDate(new Date(item.createdAt)), item.scheduledDate, from, to))
  if (categories.has('subQuests')) sections['서브퀘스트'] = data.quests.filter((item) => item.type === 'sub' && (between(item.scheduledDate, from, to) || between(item.completedAt, from, to) || between(item.createdAt, from, to)))
  if (categories.has('questCompletions')) sections['퀘스트완료이력'] = data.questCompletions.filter((item) => between(item.occurrenceDate, from, to))
  if (categories.has('relationships')) sections['인연록'] = data.relationships.filter((item) => between(item.createdAt, from, to) || between(item.updatedAt, from, to))
  if (categories.has('relationshipGroups')) sections['인연록그룹'] = data.relationshipGroups.filter((item) => between(item.createdAt, from, to) || between(item.updatedAt, from, to))
  if (categories.has('diaries')) sections['다이어리'] = data.diaries.filter((item) => between(item.date, from, to))
  if (categories.has('memos')) sections['비망록'] = data.memos.filter((item) => between(item.createdAt, from, to) || between(item.updatedAt, from, to))
  if (categories.has('ritaUsage')) sections['리타이용기록'] = (data.ritaActivity?.usage ?? []).filter((item) => between(item.createdAt, from, to))
  if (categories.has('gifts')) sections['포인트선물'] = (data.ritaActivity?.gifts ?? []).filter((item) => between(item.createdAt, from, to))
  if (categories.has('ritaConversation')) sections['리타대화'] = data.ritaConversation ?? []
  if (categories.has('attachments')) sections['첨부파일목록'] = [
    ...data.memos.flatMap((item) => item.sourceAttachment ? [{ recordType: 'memo', recordId: item.id, title: item.title, ...item.sourceAttachment }] : []),
    ...data.relationships.flatMap((item) => item.sourceAttachment ? [{ recordType: 'relationship', recordId: item.id, title: item.name, ...item.sourceAttachment }] : []),
  ]
  return sections
}

export function downloadJson(sections: Record<string, unknown[]>, from: string, to: string) {
  download(new Blob([JSON.stringify({ format: 'rumen-kingdom-selection', version: 1, exportedAt: new Date().toISOString(), period: { from, to }, data: sections }, null, 2)], { type: 'application/json' }), `rumen-${from}-${to}.json`)
}

export async function downloadZip(sections: Record<string, unknown[]>, from: string, to: string) {
  const zip = new JSZip()
  const archive = { format: 'rumen-kingdom-selection', version: 1, exportedAt: new Date().toISOString(), period: { from, to }, data: sections }
  zip.file('rumen-data.json', JSON.stringify(archive, null, 2))
  const attachmentRows = Object.values(sections).flat().filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object' && 'storagePath' in row))
  const failures: string[] = []
  if (supabase) {
    for (const [index, row] of attachmentRows.entries()) {
      const path = typeof row.storagePath === 'string' ? row.storagePath : ''
      if (!path) continue
      const { data, error } = await supabase.storage.from('rita-attachments').download(path)
      if (error || !data) { failures.push(String(row.name ?? path)); continue }
      zip.file(`attachments/${String(index + 1).padStart(3, '0')}-${safeFilename(String(row.name ?? 'attachment'))}`, data)
    }
  }
  zip.file('README.txt', [
    '루멘왕국 선택 백업',
    `기간: ${from} ~ ${to}`,
    `첨부파일: ${attachmentRows.length - failures.length}개 포함`,
    failures.length ? `받지 못한 첨부: ${failures.join(', ')}` : '',
  ].filter(Boolean).join('\n'))
  download(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }), `rumen-${from}-${to}.zip`)
}

export function downloadExcel(sections: Record<string, unknown[]>, from: string, to: string) {
  const worksheets = Object.entries(sections).map(([name, rows]) => {
    const flatRows = rows.map(flatten)
    const headers = Array.from(new Set(flatRows.flatMap((row) => Object.keys(row))))
    const rowXml = [headers, ...flatRows.map((row) => headers.map((key) => row[key] ?? ''))].map((row) => `<Row>${row.map((value) => `<Cell><Data ss:Type="String">${xml(String(value))}</Data></Cell>`).join('')}</Row>`).join('')
    return `<Worksheet ss:Name="${xml(name.slice(0, 31))}"><Table>${rowXml}</Table></Worksheet>`
  }).join('')
  const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${worksheets}</Workbook>`
  download(new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' }), `rumen-${from}-${to}.xls`)
}

export function printPdf(sections: Record<string, unknown[]>, from: string, to: string) {
  const popup = window.open('', '_blank', 'noopener,noreferrer')
  if (!popup) throw new Error('PDF 기록집을 열려면 팝업을 허용해 주세요.')
  const body = Object.entries(sections).map(([name, rows]) => `<section><h2>${html(name)} <small>${rows.length}건</small></h2>${rows.map((row) => `<article>${Object.entries(flatten(row)).map(([key, value]) => `<p><b>${html(key)}</b> ${html(String(value))}</p>`).join('')}</article>`).join('')}</section>`).join('')
  popup.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>루멘왕국 기록집</title><style>body{font-family:sans-serif;color:#392f3d;padding:32px}header{border-bottom:2px solid #806caf;margin-bottom:28px}section{break-before:page}section:first-of-type{break-before:auto}article{border-bottom:1px solid #ddd;padding:8px 0}p{margin:3px 0;font-size:12px}b{display:inline-block;min-width:110px;color:#725f83}small{color:#888}@media print{button{display:none}}</style></head><body><header><h1>루멘왕국 기록집</h1><p>${html(from)} ~ ${html(to)}</p><button onclick="window.print()">PDF로 저장·인쇄</button></header>${body}</body></html>`)
  popup.document.close()
}

function flatten(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== 'object') return { value: String(value ?? '') }
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, current]) => [key, current == null ? '' : typeof current === 'object' ? JSON.stringify(current) : current as string | number | boolean]))
}
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000) }
function xml(value: string) { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;') }
function html(value: string) { return xml(value).replaceAll("'", '&#39;') }
function safeFilename(value: string) { return [...value.normalize('NFKC')].map((character) => character.charCodeAt(0) < 32 ? '-' : character).join('').replace(/[\\/:*?"<>|]/g, '-').slice(0, 120) || 'attachment' }
