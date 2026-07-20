import { CalendarDays, RefreshCw, Sparkles } from 'lucide-react'
import { useRuntimeConfig } from '../runtime/RuntimeConfig'
import { Pagination, usePaginatedList } from '../../components/Pagination'

export function PatchNotesPage() {
  const { releases, config, source, refresh } = useRuntimeConfig()
  const pagination = usePaginatedList(releases, 'patch-notes')
  return <section className="release-page">
    <header className="release-hero panel glass-panel"><div><span className="eyebrow">KINGDOM UPDATES</span><h2>왕국 업데이트 기록</h2><p>웹·iPhone·iPad·Android에 함께 적용되는 변경 사항을 확인하세요.</p></div><button onClick={() => void refresh()}><RefreshCw size={15}/>새로 확인</button></header>
    <div className="release-meta"><span>서버 API {config.apiVersion}</span><span>{source === 'server' ? '서버 최신 정보' : source === 'cache' ? '오프라인 저장 정보' : '앱 기본 정보'}</span></div>
    <div className="release-list">{pagination.visibleItems.map((release, index) => <article className="panel glass-panel" key={release.version}><div className="release-version"><Sparkles size={17}/><span>v{release.version}</span>{pagination.page === 1 && index === 0 && <b>최신</b>}</div><div><small><CalendarDays size={13}/>{release.releaseDate}</small><h3>{release.title}</h3><ul>{release.items.map((item) => <li key={item}>{item}</li>)}</ul></div></article>)}</div>
    <Pagination page={pagination.page} totalItems={pagination.totalItems} onPageChange={pagination.setPage} label="패치노트"/>
  </section>
}
