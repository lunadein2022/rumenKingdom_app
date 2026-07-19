import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { EmptyState } from '../components/Common'
import { PageHeading } from '../components/PageHeading'
import { navigation, pageIdFromPath, pagePaths } from './navigation'
import { NavLink, useNavigate } from 'react-router-dom'
import { LoaderCircle, ShieldCheck, X } from 'lucide-react'
import { useKingdomStore } from '../store'
import { loadRoomBackgrounds } from '../services/settingsRepository'
import { PatchNotesModal } from '../components/PatchNotesModal'
import { useServiceDate } from '../lib/useServiceDate'
import { getAdminContext, type AdminContext } from '../services/adminService'
import { NotificationCenterProvider } from '../features/notifications/NotificationCenter'
import { RuntimeNotices, useRuntimeConfig } from '../features/runtime/RuntimeConfig'

const LobbyPage = lazy(() => import('../features/lobby/LobbyPage').then((module) => ({ default: module.LobbyPage })))
const OfficePage = lazy(() => import('../features/office/OfficePage').then((module) => ({ default: module.OfficePage })))
const ProjectDetailPage = lazy(() => import('../features/office/OfficePage').then((module) => ({ default: module.ProjectDetailPage })))
const CompletedProjectsPage = lazy(() => import('../features/office/OfficePage').then((module) => ({ default: module.CompletedProjectsPage })))
const CalendarPage = lazy(() => import('../features/calendar/CalendarPage').then((module) => ({ default: module.CalendarPage })))
const CalendarEventDetailPage = lazy(() => import('../features/calendar/CalendarEventDetailPage').then((module) => ({ default: module.CalendarEventDetailPage })))
const LibraryPage = lazy(() => import('../features/library/LibraryPage').then((module) => ({ default: module.LibraryPage })))
const LibraryCategoryPage = lazy(() => import('../features/library/LibraryPage').then((module) => ({ default: module.LibraryCategoryPage })))
const LibraryItemPage = lazy(() => import('../features/library/LibraryPage').then((module) => ({ default: module.LibraryItemPage })))
const MemoPage = lazy(() => import('../features/library/MemoPage').then((module) => ({ default: module.MemoPage })))
const RelationshipPage = lazy(() => import('../features/library/RelationshipPage').then((module) => ({ default: module.RelationshipPage })))
const DiaryPage = lazy(() => import('../features/diary/DiaryPage').then((module) => ({ default: module.DiaryPage })))
const GardenPage = lazy(() => import('../features/garden/GardenPage').then((module) => ({ default: module.GardenPage })))
const RitaPage = lazy(() => import('../features/rita/RitaPage').then((module) => ({ default: module.RitaPage })))
const ThronePage = lazy(() => import('../features/throne/ThronePage').then((module) => ({ default: module.ThronePage })))
const AdminPage = lazy(() => import('../features/admin/AdminPage').then((module) => ({ default: module.AdminPage })))
const NotificationsPage = lazy(() => import('../features/notifications/NotificationsPage').then((module) => ({ default: module.NotificationsPage })))
const PlansPage = lazy(() => import('../features/plans/PlansPage').then((module) => ({ default: module.PlansPage })))
const PatchNotesPage = lazy(() => import('../features/releases/PatchNotesPage').then((module) => ({ default: module.PatchNotesPage })))

export function AppRouter({ demoMode, onResetDemo, onSignOut }: { demoMode: boolean; onResetDemo: () => void; onSignOut: () => Promise<void> }) {
  const [adminRole, setAdminRole] = useState<AdminContext['role']>()
  const { featureEnabled } = useRuntimeConfig()
  useEffect(() => {
    if (demoMode) return
    let active = true
    void getAdminContext().then((context) => { if (active && context.isAdmin) setAdminRole(context.role) }).catch(() => undefined)
    return () => { active = false }
  }, [demoMode])
  return <Routes>
    <Route element={<AppLayout demoMode={demoMode} adminRole={adminRole} onSignOut={onSignOut}/>}>
    <Route index element={<LobbyPage/>}/>
    <Route path="office" element={<OfficePage/>}/>
    <Route path="office/projects/:projectId" element={<ProjectDetailPage/>}/>
    <Route path="office/completed" element={<CompletedProjectsPage/>}/>
    <Route path="calendar" element={<CalendarPage/>}/>
    <Route path="calendar/event/:eventId" element={<CalendarEventDetailPage/>}/>
    <Route path="library" element={<LibraryPage/>}/>
    <Route path="library/relationships/:relationshipId" element={<RelationshipPage/>}/>
    <Route path="library/memos/:memoId" element={<MemoPage/>}/>
    <Route path="library/item/:itemId" element={<LibraryItemPage/>}/>
    <Route path="library/:category" element={<LibraryCategoryPage/>}/>
    <Route path="diary" element={<DiaryPage/>}/>
    <Route path="diary/:date" element={<DiaryPage/>}/>
    <Route path="garden" element={<GardenPage/>}/>
    <Route path="rita" element={featureEnabled('ritaAi') ? <RitaPage demoMode={demoMode}/> : <section className="panel glass-panel feature-unavailable"><EmptyState title="리타가 잠시 자리를 비웠어요" description="왕실 AI 기능을 점검하고 있습니다. 일정과 기록 기능은 계속 이용할 수 있어요."/></section>}/>
    <Route path="throne" element={<ThronePage demoMode={demoMode} isAdmin={Boolean(adminRole)} onResetDemo={onResetDemo} onSignOut={onSignOut}/>}/>
    <Route path="admin" element={<AdminPage/>}/>
    <Route path="notifications" element={<NotificationsPage/>}/>
    <Route path="plans" element={<PlansPage/>}/>
    <Route path="patch-notes" element={<PatchNotesPage/>}/>
    <Route path="*" element={<NotFoundPage/>}/>
    </Route>
  </Routes>
}

function AppLayout({ demoMode, adminRole, onSignOut }: { demoMode: boolean; adminRole?: AdminContext['role']; onSignOut: () => Promise<void> }) {
  const location = useLocation()
  const page = pageIdFromPath(location.pathname)
  const [mobileNav, setMobileNav] = useState(false)
  const [backgrounds, setBackgrounds] = useState<Partial<Record<string, string>>>({})
  const topLevel = Object.values(pagePaths).includes(location.pathname)
  const showPageHeading = topLevel && page !== 'lobby' && page !== 'garden'
  const recordSync = useKingdomStore((state) => state.recordSync)
  const clearRecordSync = useKingdomStore((state) => state.clearRecordSync)
  const refreshRecurringQuestState = useKingdomStore((state) => state.refreshRecurringQuestState)
  const serviceToday = useServiceDate()
  const { featureEnabled } = useRuntimeConfig()
  useEffect(() => {
    // 날짜별 완료 로그를 기준으로 현재 반복 퀘스트 상태만 다시 계산한다.
    refreshRecurringQuestState(serviceToday)
  }, [serviceToday, refreshRecurringQuestState])
  useEffect(() => {
    // 저장/오류 알림은 일정 시간 뒤 자동으로 사라진다. 진행 중('saving')은 유지.
    if (recordSync.status !== 'saved' && recordSync.status !== 'error') return
    const timer = window.setTimeout(clearRecordSync, recordSync.status === 'error' ? 4000 : 2400)
    return () => window.clearTimeout(timer)
  }, [recordSync.status, recordSync.message, clearRecordSync])
  useEffect(() => {
    void loadRoomBackgrounds().then((items) => setBackgrounds(Object.fromEntries(items.filter((item) => item.url).map((item) => [item.room, item.url])))).catch(() => undefined)
    const listener = (event: Event) => { const detail = (event as CustomEvent<{ room: string; url?: string }>).detail; setBackgrounds((current) => ({ ...current, [detail.room]: detail.url ?? '' })) }
    window.addEventListener('rumen-background-updated', listener)
    return () => window.removeEventListener('rumen-background-updated', listener)
  }, [])
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.app-shell')
    if (backgrounds[page]) shell?.style.setProperty('--page-bg', `url("${backgrounds[page]}")`)
    else shell?.style.removeProperty('--page-bg')
  }, [backgrounds, page])
  return <NotificationCenterProvider demoMode={demoMode}><div className={`app-shell page-${page}`}><RouteEffects/><div className="ambient ambient-one"/><div className="ambient ambient-two"/><AppHeader demoMode={demoMode} isAdmin={Boolean(adminRole)} page={page} onMenu={() => setMobileNav((value) => !value)} onSignOut={onSignOut}/><RuntimeNotices/>{mobileNav && <nav className="mobile-nav glass-panel" aria-label="모바일 메뉴">{navigation.map((item) => { const Icon = item.icon; return <NavLink key={item.id} to={item.path} end={item.path === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileNav(false)}><Icon size={15}/>{item.label}</NavLink> })}{featureEnabled('ritaAi') && <NavLink className="nav-item" to="/rita" onClick={() => setMobileNav(false)}>리타</NavLink>}<NavLink className="nav-item" to="/plans" onClick={() => setMobileNav(false)}>요금제</NavLink><NavLink className="nav-item" to="/patch-notes" onClick={() => setMobileNav(false)}>업데이트</NavLink><NavLink className="nav-item" to="/throne" onClick={() => setMobileNav(false)}>왕좌의 방</NavLink>{adminRole && <NavLink className="nav-item admin-nav-item" to="/admin" onClick={() => setMobileNav(false)}><ShieldCheck size={15}/>왕실 관리</NavLink>}<button className="nav-item" onClick={() => void onSignOut()}>{demoMode ? '로그인하기' : '로그아웃'}</button></nav>}<main className="main-wrap">{showPageHeading && <PageHeading page={page}/>}<Suspense fallback={<div className="route-loading" role="status"><LoaderCircle size={22} className="spin"/><span>왕궁의 방을 준비하고 있어요.</span></div>}><Outlet/></Suspense></main><footer><span>Copyright © RUMEN KINGDOM</span><NavLink to="/patch-notes">업데이트</NavLink><NavLink to="/plans">요금제</NavLink><span>All Rights Reserved.</span></footer>{recordSync.status !== 'idle' && <div className={`calendar-sync ${recordSync.status}`} role="status">{recordSync.status === 'saving' && <LoaderCircle size={15} className="spin"/>}<span>{recordSync.message}</span>{recordSync.status !== 'saving' && <button onClick={clearRecordSync} aria-label="저장 알림 닫기"><X size={14}/></button>}</div>}<PatchNotesModal/></div></NotificationCenterProvider>
}

function RouteEffects() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    window.setTimeout(() => document.querySelector<HTMLElement>('.page-heading, .back-button, main h2')?.focus(), 0)
  }, [location.pathname])
  return null
}

function NotFoundPage() {
  const navigate = useNavigate()
  return <section className="panel glass-panel not-found"><EmptyState title="길을 잃으셨군요, 공주님" description="요청한 왕국의 방을 찾을 수 없습니다." action="로비로 돌아가기" onAction={() => navigate('/', { replace: true })}/></section>
}

export function LegacyRouteRedirect() { return <Navigate to="/" replace/> }
