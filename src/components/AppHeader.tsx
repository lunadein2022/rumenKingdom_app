import { useEffect, useMemo, useState } from 'react'
import { Bell, Coins, LogOut, Menu, Search, ShieldCheck, Sparkles, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { navigation } from '../app/navigation'
import { useKingdomStore } from '../store'
import type { PageId } from '../types'
import { useServiceDate } from '../lib/useServiceDate'
import { accountStorage, accountStorageKey, readAccountStorage } from '../lib/accountScope'
import { BodyAreaOverlay } from './BodyAreaOverlay'
import { PrincessPortrait } from './PrincessPortrait'
import { useSelectedPrincess } from '../lib/princesses'
import { loadAccountNotifications, markAccountNotificationRead, markAccountNotificationsRead, type AccountNotification } from '../services/notificationService'
import { useRitaUsage } from '../lib/useRitaUsage'

type HeaderNotification = { id: string; title: string; meta: string; path: string; read: boolean; remoteId?: string }

export function AppHeader({ demoMode, isAdmin, page, onMenu, onSignOut }: { demoMode: boolean; isAdmin: boolean; page: PageId; onMenu: () => void; onSignOut: () => Promise<void> }) {
  const navigate = useNavigate()
  const { events, quests, projects, memos, relationships, diaries, setSelectedDate } = useKingdomStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [accountNotifications, setAccountNotifications] = useState<AccountNotification[]>([])
  const serviceToday = useServiceDate()
  const princess = useSelectedPrincess()
  const { usage } = useRitaUsage(!demoMode)
  const scopedStorage = accountStorage()
  const notificationReadKey = accountStorageKey('rumen-read-notifications')
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => readAccountStorage('rumen-in-app-notifications') !== 'off')
  useEffect(() => {
    const listener = (event: Event) => setNotificationsEnabled((event as CustomEvent<boolean>).detail)
    window.addEventListener('rumen-notification-setting', listener)
    return () => window.removeEventListener('rumen-notification-setting', listener)
  }, [])
  const [readNotifications, setReadNotifications] = useState<string[]>(() => {
    try { return JSON.parse(scopedStorage.getItem(notificationReadKey) ?? '[]') as string[] } catch { return [] }
  })
  useEffect(() => {
    if (demoMode) return
    let active = true
    const refresh = () => void loadAccountNotifications().then((items) => { if (active) setAccountNotifications(items) }).catch(() => undefined)
    refresh()
    const interval = window.setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    window.addEventListener('rumen-notifications-changed', refresh)
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('focus', refresh); window.removeEventListener('rumen-notifications-changed', refresh) }
  }, [demoMode])
  const notificationItems = useMemo<HeaderNotification[]>(() => [
    ...accountNotifications.map((item) => ({ id: `server:${item.id}`, remoteId: item.id, title: item.title, meta: item.body, path: '/throne', read: Boolean(item.readAt) })),
    ...events.filter((event) => event.date <= serviceToday && (event.endDate ?? event.date) >= serviceToday).map((event) => ({ id: `event:${event.id}:${serviceToday}`, title: event.title, meta: event.allDay ? '오늘 · 종일 일정' : `오늘 ${event.start || '시간 미정'}`, path: `/calendar/event/${event.id}`, read: readNotifications.includes(`event:${event.id}:${serviceToday}`) })),
    ...quests.flatMap((quest) => { const due = quest.scheduledDate; const id = `quest:${quest.id}:${due}`; return !quest.done && due && due <= serviceToday ? [{ id, title: quest.title, meta: due < serviceToday ? '마감일이 지났어요' : `오늘 ${quest.scheduledTime ?? '마감'}`, path: `/library/item/${encodeURIComponent(`${quest.type === 'daily' ? 'dailyQuest' : 'subQuest'}:${quest.id}`)}`, read: readNotifications.includes(id) }] : [] }),
    ...memos.filter((memo) => memo.status === 'review').map((memo) => { const id = `memo:${memo.id}`; return { id, title: memo.title, meta: '확인이 필요한 비망록', path: `/library/memos/${memo.id}`, read: readNotifications.includes(id) } }),
  ].slice(0, 20), [accountNotifications, events, memos, quests, readNotifications, serviceToday])
  const unreadCount = notificationsEnabled ? notificationItems.filter((item) => !item.read).length : 0
  const openNotification = (item: HeaderNotification) => {
    if (item.remoteId) {
      setAccountNotifications((current) => current.map((entry) => entry.id === item.remoteId ? { ...entry, readAt: new Date().toISOString() } : entry))
      void markAccountNotificationRead(item.remoteId).catch(() => undefined)
    } else {
      const next = Array.from(new Set([...readNotifications, item.id]))
      setReadNotifications(next); scopedStorage.setItem(notificationReadKey, JSON.stringify(next))
    }
    setNotificationOpen(false); navigate(item.path)
  }
  const normalized = query.trim().toLocaleLowerCase('ko')
  const results = useMemo(() => [
    ...events.map((item) => ({ id: item.id, title: item.title, meta: `${item.date} · 일정`, path: `/calendar/event/${item.id}`, date: item.date })),
    ...projects.map((item) => ({ id: item.id, title: item.title, meta: `${item.tag} · 메인퀘스트`, path: `/office/projects/${item.id}` })),
    ...quests.map((item) => ({ id: item.id, title: item.title, meta: `${item.type === 'daily' ? '일일퀘스트' : '서브퀘스트'} · ${item.due}`, path: `/library/${item.type === 'daily' ? 'daily-quests' : 'sub-quests'}` })),
    ...memos.map((item) => ({ id: item.id, title: item.title, meta: '비망록', path: `/library/memos/${item.id}` })),
    ...relationships.map((item) => ({ id: item.id, title: item.name, meta: `${item.organization || '소속 미지정'} · 인연록`, path: `/library/relationships/${item.id}` })),
    ...diaries.map((item) => ({ id: item.id, title: item.title || item.date, meta: `${item.date} · 다이어리`, path: `/diary/${item.date}` })),
  ].filter((item) => !normalized || `${item.title} ${item.meta}`.toLocaleLowerCase('ko').includes(normalized)).slice(0, 12), [diaries, events, memos, normalized, projects, quests, relationships])

  const selectResult = (result: { path: string; date?: string }) => {
    if (result.date) setSelectedDate(result.date)
    navigate(result.path)
    setSearchOpen(false)
    setQuery('')
  }

  return <>
    <header className="topbar glass-panel" data-page={page}>
      <NavLink className="brand" to="/" aria-label="로비로 이동"><img src="/assets/brand/header-logo-v3.webp" alt="루멘왕국 공주의 하루" /></NavLink>
      <nav className="desktop-nav" aria-label="주요 메뉴">{navigation.map((item) => { const Icon = item.icon; return <NavLink key={item.id} to={item.path} end={item.path === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={15}/>{item.label}</NavLink> })}</nav>
      {demoMode && <button className="demo-mode-badge" onClick={() => void onSignOut()} title="로그인 화면으로 이동">DEMO MODE</button>}
      <div className="header-actions">
        {!demoMode && <NavLink className="header-points" to="/throne" aria-label={`리타 포인트 ${usage?.totalRemaining ?? 0}점`} title={usage ? `월 ${usage.monthlyRemaining}P + 보너스·선물 ${usage.bonusRemaining}P` : '포인트 확인 중'}><Coins size={16}/><span>{usage ? `${usage.totalRemaining.toLocaleString()}P` : '—'}</span></NavLink>}
        <button aria-label="전체 검색" onClick={() => setSearchOpen(true)}><Search size={18}/></button>
        <button aria-label={`알림 ${unreadCount}개`} className={notificationOpen ? 'active' : ''} onClick={() => setNotificationOpen((value) => !value)}><Bell size={18}/>{unreadCount > 0 && <i/>}</button>
        <NavLink className="header-shortcut rita-shortcut" to="/rita" aria-label="리타 바로가기"><Sparkles size={17}/><span>리타</span></NavLink>
        <NavLink className="header-shortcut throne-shortcut" to="/throne" aria-label="왕좌의 방"><PrincessPortrait className="header-princess-avatar" princess={princess}/><span>왕좌</span></NavLink>
        {isAdmin && <NavLink className="header-shortcut admin-shortcut" to="/admin" aria-label="왕실 관리자 페이지"><ShieldCheck size={17}/><span>관리</span></NavLink>}
        <button className="header-shortcut logout-shortcut" aria-label={demoMode ? '로그인하기' : '로그아웃'} onClick={() => void onSignOut()}><LogOut size={17}/><span>{demoMode ? '로그인' : '로그아웃'}</span></button>
        <button className="menu-button" aria-label="메뉴" onClick={onMenu}><Menu size={20}/></button>
      </div>
      {notificationOpen && <aside className="notification-popover glass-panel"><div><b>왕실 알림 · {unreadCount}</b><button onClick={() => setNotificationOpen(false)} aria-label="알림 닫기"><X size={14}/></button></div>{!notificationsEnabled ? <p>왕좌의 방에서 앱 내부 알림이 꺼져 있습니다.</p> : notificationItems.length ? <div className="notification-items">{notificationItems.map((item) => <button key={item.id} className={item.read ? 'read' : ''} onClick={() => openNotification(item)}><b>{item.title}</b><small>{item.meta}</small></button>)}</div> : <p>새로운 알림이 없습니다.</p>}{unreadCount > 0 && <button className="notification-read-all" onClick={() => { const localIds = notificationItems.filter((item) => !item.remoteId).map((item) => item.id); const remoteIds = notificationItems.flatMap((item) => item.remoteId ? [item.remoteId] : []); setReadNotifications(Array.from(new Set([...readNotifications, ...localIds]))); scopedStorage.setItem(notificationReadKey, JSON.stringify(Array.from(new Set([...readNotifications, ...localIds])))); setAccountNotifications((current) => current.map((item) => remoteIds.includes(item.id) ? { ...item, readAt: new Date().toISOString() } : item)); void markAccountNotificationsRead(remoteIds).catch(() => undefined) }}>모두 읽음</button>}</aside>}
    </header>
    {searchOpen && <BodyAreaOverlay className="search-overlay" onClose={() => setSearchOpen(false)}><section className="global-search glass-panel" role="dialog" aria-modal="true" aria-labelledby="global-search-title" onMouseDown={(event) => event.stopPropagation()}><div className="global-search-input"><Search size={20}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="일정, 퀘스트, 인연, 메모 검색" aria-label="전체 검색"/><button onClick={() => setSearchOpen(false)} aria-label="검색 닫기"><X size={18}/></button></div><h2 id="global-search-title" className="sr-only">전체 검색</h2><div className="global-results">{normalized ? results.length ? results.map((result) => <button key={`${result.path}-${result.id}`} onClick={() => selectResult(result)}><b>{result.title}</b><small>{result.meta}</small></button>) : <p>검색 결과가 없습니다.</p> : <p>찾고 싶은 기록의 제목이나 내용을 입력하세요.</p>}</div></section></BodyAreaOverlay>}
  </>
}
