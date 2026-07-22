import { useMemo, useState } from 'react'
import { Archive, Download, FileJson, FileSpreadsheet, Printer } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'
import { useKingdomStore } from '../../store'
import { accountStorage, accountStorageKey } from '../../lib/accountScope'
import { getRitaActivity, type RitaActivity } from '../../services/ritaService'
import { buildExportSections, downloadExcel, downloadJson, downloadZip, printPdf, type ExportCategory } from '../../lib/dataExport'

const options: { id: ExportCategory; label: string }[] = [
  ['events', '왕실 일정'], ['projects', '메인퀘스트'], ['dailyQuests', '일일퀘스트'], ['subQuests', '서브퀘스트'], ['questCompletions', '퀘스트 완료 이력'],
  ['relationships', '인연록'], ['relationshipGroups', '인연록 그룹'], ['diaries', '다이어리'], ['memos', '비망록'], ['ritaUsage', '리타 이용 기록'], ['gifts', '포인트·선물'], ['ritaConversation', '리타 대화'], ['attachments', '첨부파일 목록'],
].map(([id, label]) => ({ id: id as ExportCategory, label }))

export function DataExportPanel({ demoMode }: { demoMode: boolean }) {
  const store = useKingdomStore()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [to, setTo] = useState(today)
  const [categories, setCategories] = useState<Set<ExportCategory>>(() => new Set(options.filter((item) => item.id !== 'attachments').map((item) => item.id)))
  const [activity, setActivity] = useState<RitaActivity>()
  const [message, setMessage] = useState('')
  const conversation = useMemo(() => { try { return JSON.parse(accountStorage().getItem(accountStorageKey('rumen-rita-conversation')) ?? '[]') as unknown[] } catch { return [] } }, [])
  const sections = useMemo(() => buildExportSections({ ...store, ritaActivity: activity, ritaConversation: conversation }, categories, from, to), [activity, categories, conversation, from, store, to])
  const total = Object.values(sections).reduce((sum, rows) => sum + rows.length, 0)
  const toggle = (id: ExportCategory) => setCategories((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const prepare = async () => { if (!demoMode && (categories.has('ritaUsage') || categories.has('gifts'))) setActivity(await getRitaActivity().catch(() => undefined)); setMessage('내보낼 기록을 준비했어요.') }
  return <section className="data-export panel glass-panel"><header><div><span className="eyebrow">SELECTIVE ARCHIVE</span><h2>기간·카테고리별 내보내기</h2><p>필요한 기록만 골라 백업하거나 Excel·PDF 기록집으로 보관하세요.</p></div><Download/></header><div className="export-period"><label>시작일<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)}/></label><label>종료일<input type="date" value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)}/></label></div><fieldset><legend>내보낼 카테고리</legend><div className="export-categories">{options.map((item) => <label key={item.id}><input type="checkbox" checked={categories.has(item.id)} onChange={() => toggle(item.id)}/><span>{item.label}</span></label>)}</div></fieldset><button className="export-prepare" onClick={() => void prepare()}>선택 결과 확인</button><div className="export-summary">{Object.entries(sections).map(([name, rows]) => <span key={name}><b>{name}</b><strong>{rows.length}건</strong></span>)}<em>총 {total}건</em></div>{message && <p role="status">{message}</p>}<div className="export-actions"><button disabled={!total} onClick={() => downloadJson(sections, from, to)}><FileJson/>JSON</button><button disabled={!total} onClick={() => void downloadZip(sections, from, to).catch((error) => setMessage(error instanceof Error ? error.message : 'ZIP 백업을 만들지 못했어요.'))}><Archive/>ZIP·첨부</button><button disabled={!total} onClick={() => downloadExcel(sections, from, to)}><FileSpreadsheet/>Excel</button><button disabled={!total} onClick={() => { try { printPdf(sections, from, to) } catch (error) { setMessage(error instanceof Error ? error.message : '기록집을 열지 못했어요.') } }}><Printer/>PDF·인쇄</button></div></section>
}
