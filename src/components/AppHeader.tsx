import { useEffect, useMemo, useState } from 'react'
import { Bell, Coins, LogOut, Menu, Search, ShieldCheck, Sparkles, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { navigation } from '../app/navigation'
import { useKingdomStore } from '../store'
import type { PageId } from '../types'
import { BodyAreaOverlay } from './BodyAreaOverlay'
import { PrincessPortrait } from './PrincessPortrait'
import { useSelectedPrincess } from '../lib/princesses'
import { useRitaUsage } from '../lib/useRitaUsage'
import { useNotificationCenter, type KingdomNotification } from '../features/notifications/notificationContext'
import { Pagination, usePaginatedList } from './Pagination'
import { searchKingdom, type KingdomSearchResult } from '../services/searchService'

export function AppHeader({ demoMode, isAdmin, page, onMenu, onSignOut }: { demoMode: boolean; isAdmin: boolean; page: PageId; onMenu: () => void; onSignOut: () => Promise<void> }) {
  const navigate = useNavigate()
  const { events, quests, projects, memos, relationships, diaries, setSelectedDate } = useKingdomStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [remoteResults, setRemoteResults] = useState<KingdomSearchResult[]>([])
  const [remoteTotal, setRemoteTotal] = useState(0)
  const [remotePage, setRemotePage] = useState(1)
  const [searchLoading, setSearchLoading] = useState(false)
  const [remoteSearchUnavailable, setRemoteSearchUnavailable] = useState(false)
  const princess = useSelectedPrincess()
  const { usage } = useRitaUsage(!demoMode)
  const { notifications: notificationItems, notificationsEnabled, unreadCount, markRead, markAllRead } = useNotificationCenter()
  const openNotification = (item: KingdomNotification) => {
    markRead(item)
    setNotificationOpen(false); navigate(item.path)
  }
  const normalized = query.trim().toLocaleLowerCase('ko')
  const localResults = useMemo(() => [
    ...events.map((item) => ({ id: item.id, title: item.title, meta: `${item.date} · 일정`, path: `/calendar/event/${item.id}`, date: item.date })),
    ...projects.map((item) => ({ id: item.id, title: item.title, meta: `${item.tag} · 메인퀘스트`, path: `/office/projects/${item.id}` })),
    ...quests.map((item) => ({ id: item.id, title: item.title, meta: `${item.type === 'daily' ? '일일퀘스트' : '서브퀘스트'} · ${item.due}`, path: `/library/${item.type === 'daily' ? 'daily-quests' : 'sub-quests'}` })),
    ...memos.map((item) => ({ id: item.id, title: item.title, meta: '비망록', path: `/library/memos/${item.id}` })),
    ...relationships.map((item) => ({ id: item.id, title: item.name, meta: `${item.organization || '소속 미지정'} · 인연록`, path: `/library/relationships/${item.id}` })),
    ...diaries.map((item) => ({ id: item.id, title: item.title || item.date, meta: `${item.date} · 다이어리`, path: `/diary/${item.date}` })),
  ].filter((item) => !normalized || `${item.title} ${item.meta}`.toLocaleLowerCase('ko').includes(normalized)), [diaries, events, memos, normalized, projects, quests, relationships])
  const searchPage = usePaginatedList(localResults, normalized)
  const useLocalSearch = demoMode || remoteSearchUnavailable
  const results = useLocalSearch ? localResults : remoteResults
  useEffect(() => {
    if (demoMode || !normalized) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSearchLoading(true)
      void searchKingdom(normalized, remotePage)
        .then((result) => { if (!controller.signal.aborted) { setRemoteResults(result.items); setRemoteTotal(result.total); setRemoteSearchUnavailable(false) } })
        .catch(() => { if (!controller.signal.aborted) { setRemoteResults([]); setRemoteTotal(0); setRemoteSearchUnavailable(true) } })
        .finally(() => { if (!controller.signal.aborted) setSearchLoading(false) })
    }, 250)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [demoMode, normalized, remotePage])

  const selectResult = (result: { path: string; date?: string }) => {
    if (result.date) setSelectedDate(result.date)
    navigate(result.path)
    setSearchOpen(false)
    setQuery(''); setRemotePage(1)
  }

  return <>
    <header className="topbar glass-panel" data-page={page}>
      <NavLink className="brand" to="/" aria-label="로비로 이동"><img src="/assets/brand/header-logo-v3.webp" alt="루멘왕국 공주의 하루" /></NavLink>
      <nav className="desktop-nav" aria-label="주요 메뉴">{navigation.map((item) => { const Icon = item.icon; return <NavLink key={item.id} to={item.path} end={item.path === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={15}/>{item.label}</NavLink> })}</nav>
      {demoMode && <button className="demo-mode-badge" onClick={() => void onSignOut()} title="로그인 화면으로 이동">DEMO MODE</button>}
      <div className="header-actions">
        {!demoMode && <NavLink className="header-points" to="/throne" aria-label={`리타 포인트 ${usage?.totalRemaining ?? 0}점`} title={usage ? `월 ${usage.monthlyRemaining}P + 보너스·선물 ${usage.bonusRemaining}P` : '포인트 확인 중'}><Coins size={16}/><span>{usage ? `${usage.totalRemaining.toLocaleString()}P` : '—'}</span></NavLink>}
        <button aria-label="전체 검색" onClick={() => setSearchOpen(true)}><Search size={18}/></button>
        <button
          aria-label={`알림 ${unreadCount}개`}
          aria-expanded={notificationOpen}
          aria-haspopup="dialog"
          className={`notification-button ${notificationOpen ? 'active' : ''}`}
          onClick={() => setNotificationOpen((value) => !value)}
        >
          <Bell size={18}/>
          {unreadCount > 0 && <span className="notification-badge" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
        <NavLink className="header-shortcut rita-shortcut" to="/rita" aria-label="리타 바로가기"><Sparkles size={17}/><span>리타</span></NavLink>
        <NavLink className="header-shortcut throne-shortcut" to="/throne" aria-label="왕좌의 방"><PrincessPortrait className="header-princess-avatar" princess={princess}/><span>왕좌</span></NavLink>
        {isAdmin && <NavLink className="header-shortcut admin-shortcut" to="/admin" aria-label="왕실 관리자 페이지"><ShieldCheck size={17}/><span>관리</span></NavLink>}
        <button className="header-shortcut logout-shortcut" aria-label={demoMode ? '로그인하기' : '로그아웃'} onClick={() => void onSignOut()}><LogOut size={17}/><span>{demoMode ? '로그인' : '로그아웃'}</span></button>
        <button className="menu-button" aria-label="메뉴" onClick={onMenu}><Menu size={20}/></button>
      </div>
      {notificationOpen && <aside className="notification-popover glass-panel" role="dialog" aria-label="알림 목록">
        <div className="notification-popover-head"><b>왕실 알림</b><span>{unreadCount ? `미확인 ${unreadCount}` : '모두 확인'}</span><button onClick={() => setNotificationOpen(false)} aria-label="알림 닫기"><X size={14}/></button></div>
        {!notificationsEnabled ? <p>왕좌의 방에서 앱 내부 알림이 꺼져 있습니다.</p> : notificationItems.length ? <div className="notification-items">{notificationItems.slice(0, 5).map((item) => <button key={item.id} className={item.read ? 'read' : ''} onClick={() => openNotification(item)}><span className="notification-line"><b>{item.title}</b>{item.summary && <small> · {item.summary}</small>}</span>{!item.read && <i aria-label="미확인"/>}</button>)}</div> : <p>새로운 알림이 없습니다.</p>}
        <div className="notification-popover-actions">{unreadCount > 0 && <button className="notification-read-all" onClick={markAllRead}>모두 읽음</button>}<button className="notification-view-all" onClick={() => { setNotificationOpen(false); navigate('/notifications') }}>전체 알림 보기</button></div>
      </aside>}
    </header>
    {searchOpen && <BodyAreaOverlay className="search-overlay" onClose={() => setSearchOpen(false)}><section className="global-search glass-panel" role="dialog" aria-modal="true" aria-labelledby="global-search-title" onMouseDown={(event) => event.stopPropagation()}><div className="global-search-input"><Search size={20}/><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setRemotePage(1) }} placeholder="일정, 퀘스트, 인연, 메모 검색" aria-label="전체 검색"/><button onClick={() => setSearchOpen(false)} aria-label="검색 닫기"><X size={18}/></button></div><h2 id="global-search-title" className="sr-only">전체 검색</h2><div className="global-results" aria-busy={searchLoading}>{normalized ? searchLoading ? <p>왕국의 기록을 찾고 있어요…</p> : results.length ? (useLocalSearch ? searchPage.visibleItems : results).map((result) => <button key={`${result.path}-${result.id}`} onClick={() => selectResult(result)}><b>{result.title}</b><small>{result.meta}</small></button>) : <p>검색 결과가 없습니다.</p> : <p>찾고 싶은 기록의 제목이나 내용을 입력하세요.</p>}</div>{normalized && (useLocalSearch ? <Pagination page={searchPage.page} totalItems={searchPage.totalItems} onPageChange={searchPage.setPage} label="통합검색 결과"/> : <Pagination page={remotePage} totalItems={remoteTotal} onPageChange={setRemotePage} label="통합검색 결과"/>)}</section></BodyAreaOverlay>}
  </>
}
