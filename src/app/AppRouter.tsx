import { useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { EmptyState } from '../components/Common'
import { PageHeading } from '../components/PageHeading'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { CalendarEventDetailPage } from '../features/calendar/CalendarEventDetailPage'
import { DiaryPage } from '../features/diary/DiaryPage'
import { GardenPage } from '../features/garden/GardenPage'
import { LibraryCategoryPage, LibraryItemPage, LibraryPage } from '../features/library/LibraryPage'
import { MemoPage } from '../features/library/MemoPage'
import { RelationshipPage } from '../features/library/RelationshipPage'
import { LobbyPage } from '../features/lobby/LobbyPage'
import { CompletedProjectsPage, OfficePage, ProjectDetailPage } from '../features/office/OfficePage'
import { RitaPage } from '../features/rita/RitaPage'
import { ThronePage } from '../features/throne/ThronePage'
import { navigation, pageIdFromPath, pagePaths } from './navigation'
import { NavLink, useNavigate } from 'react-router-dom'

export function AppRouter({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return <Routes><Route element={<AppLayout onSignOut={onSignOut}/>}>
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
    <Route path="rita" element={<RitaPage/>}/>
    <Route path="throne" element={<ThronePage onSignOut={onSignOut}/>}/>
    <Route path="*" element={<NotFoundPage/>}/>
  </Route></Routes>
}

function AppLayout({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const location = useLocation()
  const page = pageIdFromPath(location.pathname)
  const [mobileNav, setMobileNav] = useState(false)
  const topLevel = Object.values(pagePaths).includes(location.pathname)
  const showPageHeading = topLevel && page !== 'lobby' && page !== 'garden'
  return <div className={`app-shell page-${page}`}><RouteEffects/><div className="ambient ambient-one"/><div className="ambient ambient-two"/><AppHeader page={page} onMenu={() => setMobileNav((value) => !value)} onSignOut={onSignOut}/>{mobileNav && <nav className="mobile-nav glass-panel" aria-label="모바일 메뉴">{navigation.map((item) => { const Icon = item.icon; return <NavLink key={item.id} to={item.path} end={item.path === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileNav(false)}><Icon size={15}/>{item.label}</NavLink> })}<NavLink className="nav-item" to="/rita" onClick={() => setMobileNav(false)}>리타</NavLink><NavLink className="nav-item" to="/throne" onClick={() => setMobileNav(false)}>왕좌의 방</NavLink><button className="nav-item" onClick={() => void onSignOut()}>로그아웃</button></nav>}<main className="main-wrap">{showPageHeading && <PageHeading page={page}/>}<Outlet/></main><footer><span>Copyright © RUMEN KINGDOM</span><span>All Rights Reserved.</span></footer></div>
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
