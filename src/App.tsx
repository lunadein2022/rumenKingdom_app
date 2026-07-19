import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './app/AppRouter'
import { LoginScreen } from './components/LoginScreen'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { activateKingdomAccount, deactivateKingdomAccount, useKingdomStore } from './store'
import { clearDemoSessionStorage, createDemoSessionId, currentDemoSessionId, DEMO_MODE_KEY, writeAccountStorage } from './lib/accountScope'
import { loadPreferences } from './services/settingsRepository'
import { storeSelectedPrincessId } from './lib/princesses'
import { configureServiceTime, resetServiceTime } from './lib/serviceTime'
import { WebAppStatus } from './components/WebAppStatus'
import { startSyncEngine } from './lib/syncEngine'
import { Capacitor } from '@capacitor/core'
import { MobileServiceSetup } from './components/MobileServiceSetup'
import { RuntimeConfigProvider } from './features/runtime/RuntimeConfig'

function App() {
  if (Capacitor.isNativePlatform() && !isSupabaseConfigured) return <MobileServiceSetup />
  return <ConfiguredApp />
}

function ConfiguredApp() {
  const hydrateEvents = useKingdomStore((state) => state.hydrateEvents)
  const hydrateProjects = useKingdomStore((state) => state.hydrateProjects)
  const hydrateQuests = useKingdomStore((state) => state.hydrateQuests)
  const hydrateMemos = useKingdomStore((state) => state.hydrateMemos)
  const hydrateRelationships = useKingdomStore((state) => state.hydrateRelationships)
  const hydrateRelationshipGroups = useKingdomStore((state) => state.hydrateRelationshipGroups)
  const hydrateDiaries = useKingdomStore((state) => state.hydrateDiaries)
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [authNotice, setAuthNotice] = useState('')
  const [demoSessionId, setDemoSessionId] = useState<string | null>(() => {
    if (sessionStorage.getItem(DEMO_MODE_KEY) !== 'true') return null
    return currentDemoSessionId() ?? createDemoSessionId()
  })
  const guestMode = Boolean(demoSessionId)
  const [dataReady, setDataReady] = useState(false)
  const activeUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let active = true
    const timeout = window.setTimeout(() => {
      if (!active) return
      setAuthNotice('로그인 상태 확인이 지연되고 있어요. 로그인 화면에서 다시 시도해 주세요.')
      setAuthReady(true)
    }, 4000)

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error
        if (active) {
          activeUserIdRef.current = data.session?.user?.id ?? null
          setSession(data.session)
          setAuthNotice('')
        }
      })
      .catch(() => {
        if (active) setAuthNotice('로그인 상태를 확인하지 못했어요. 네트워크 연결을 확인해 주세요.')
      })
      .finally(() => {
        if (!active) return
        window.clearTimeout(timeout)
        setAuthReady(true)
      })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      window.clearTimeout(timeout)
      setAuthReady(true)
      setAuthNotice('')
      // 같은 사용자에 대한 토큰 갱신·탭 포커스 재진입 이벤트는 무시한다.
      // (앱 전체를 재하이드레이션하면 입력 중이던 폼이 사라지므로)
      const nextUserId = nextSession?.user?.id ?? null
      if (nextUserId === activeUserIdRef.current) return
      // 실제 로그인/로그아웃/사용자 교체일 때만 다시 불러온다.
      activeUserIdRef.current = nextUserId
      setDataReady(false)
      setSession(nextSession)
    })
    return () => {
      active = false
      window.clearTimeout(timeout)
      data.subscription.unsubscribe()
    }
  }, [])
  useEffect(() => {
    let active = true
    const prepare = async () => {
      if (session) {
        const preferences = await loadPreferences().catch(() => null)
        if (preferences) {
          configureServiceTime(preferences.timezone, preferences.serviceDayStartsAt)
        } else resetServiceTime()
        await activateKingdomAccount(`user:${session.user.id}`)
        if (preferences) {
          writeAccountStorage('rumen-princess-name', preferences.profileName)
          writeAccountStorage('rumen-princess-intro', preferences.profileIntro)
          writeAccountStorage('rumen-in-app-notifications', preferences.notifications ? 'on' : 'off')
          writeAccountStorage('rumen-rita-style', preferences.aiStyle)
          storeSelectedPrincessId(preferences.selectedPrincessId)
        }
        await Promise.all([hydrateEvents(), hydrateProjects(), hydrateMemos(), hydrateRelationshipGroups(), hydrateRelationships(), hydrateDiaries()])
        await hydrateQuests()
        if (active) setDataReady(true)
      } else if (guestMode) {
        resetServiceTime()
        await activateKingdomAccount(`demo:${demoSessionId}`, true)
        await Promise.all([hydrateEvents(), hydrateProjects(), hydrateMemos(), hydrateRelationshipGroups(), hydrateRelationships(), hydrateDiaries()])
        await hydrateQuests()
        if (active) setDataReady(true)
      } else {
        resetServiceTime()
        deactivateKingdomAccount()
      }
    }
    void prepare()
    return () => { active = false }
  }, [demoSessionId, guestMode, hydrateEvents, hydrateProjects, hydrateQuests, hydrateMemos, hydrateRelationshipGroups, hydrateRelationships, hydrateDiaries, session])
  useEffect(() => {
    if (!session || !dataReady) return
    const refresh = () => {
      void Promise.all([
        hydrateEvents(), hydrateProjects(), hydrateMemos(), hydrateRelationshipGroups(),
        hydrateRelationships(), hydrateDiaries(),
      ]).then(() => hydrateQuests())
    }
    const stop = startSyncEngine(refresh)
    const conflict = () => refresh()
    window.addEventListener('rumen-sync-conflict', conflict)
    return () => { stop(); window.removeEventListener('rumen-sync-conflict', conflict) }
  }, [dataReady, hydrateDiaries, hydrateEvents, hydrateMemos, hydrateProjects, hydrateQuests, hydrateRelationshipGroups, hydrateRelationships, session])

  const enterGuest = () => { setDataReady(false); setDemoSessionId(createDemoSessionId()) }
  const signOut = async () => {
    setDataReady(false)
    activeUserIdRef.current = null
    if (demoSessionId) clearDemoSessionStorage(`demo:${demoSessionId}`)
    deactivateKingdomAccount()
    resetServiceTime()
    if (session) await supabase?.auth.signOut()
    setDemoSessionId(null)
    setSession(null)
  }
  const resetDemo = () => {
    if (!demoSessionId) return
    setDataReady(false)
    clearDemoSessionStorage(`demo:${demoSessionId}`)
    deactivateKingdomAccount()
    resetServiceTime()
    setDemoSessionId(createDemoSessionId())
  }
  return <BrowserRouter><RuntimeConfigProvider>
    {!authReady
      ? <div className="auth-loading"><img src="/assets/brand/main-logo.webp" alt="루멘왕국, 공주의 하루"/><span>왕실 문을 준비하고 있어요...</span></div>
      : !session && !guestMode
        ? <LoginScreen onGuest={enterGuest} initialMessage={authNotice}/>
        : !dataReady
          ? <div className="auth-loading"><img src="/assets/brand/main-logo.webp" alt="루멘왕국, 공주의 하루"/><span>공주님의 왕국 기록을 불러오고 있어요...</span></div>
          : <AppRouter demoMode={guestMode && !session} onResetDemo={resetDemo} onSignOut={signOut}/>
    }
    <WebAppStatus/>
  </RuntimeConfigProvider></BrowserRouter>
}

export default App
