import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './app/AppRouter'
import { LoginScreen } from './components/LoginScreen'
import { supabase } from './lib/supabase'
import { activateKingdomAccount, deactivateKingdomAccount, useKingdomStore } from './store'

function App() {
  const hydrateEvents = useKingdomStore((state) => state.hydrateEvents)
  const hydrateProjects = useKingdomStore((state) => state.hydrateProjects)
  const hydrateQuests = useKingdomStore((state) => state.hydrateQuests)
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [authNotice, setAuthNotice] = useState('')
  const [guestMode, setGuestMode] = useState(() => sessionStorage.getItem('rumen-guest-mode') === 'true')
  const [dataReady, setDataReady] = useState(false)

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
      setDataReady(false)
      setSession(nextSession)
      setAuthNotice('')
      setAuthReady(true)
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
        await activateKingdomAccount(`user:${session.user.id}`)
        await Promise.all([hydrateEvents(), hydrateProjects()])
        await hydrateQuests()
        if (active) setDataReady(true)
      } else if (guestMode) {
        await activateKingdomAccount('guest', true)
        await Promise.all([hydrateEvents(), hydrateProjects()])
        await hydrateQuests()
        if (active) setDataReady(true)
      } else {
        deactivateKingdomAccount()
      }
    }
    void prepare()
    return () => { active = false }
  }, [guestMode, hydrateEvents, hydrateProjects, hydrateQuests, session])

  const enterGuest = () => { setDataReady(false); sessionStorage.setItem('rumen-guest-mode', 'true'); setGuestMode(true) }
  const signOut = async () => { setDataReady(false); deactivateKingdomAccount(); if (session) await supabase?.auth.signOut(); sessionStorage.removeItem('rumen-guest-mode'); setGuestMode(false); setSession(null) }
  const resetDemo = () => useKingdomStore.getState().resetForAccount(true)
  return <BrowserRouter>
    {!authReady
      ? <div className="auth-loading"><img src="/assets/brand/main-logo.webp" alt="루멘왕국, 공주의 하루"/><span>왕실 문을 준비하고 있어요...</span></div>
      : !session && !guestMode
        ? <LoginScreen onGuest={enterGuest} initialMessage={authNotice}/>
        : !dataReady
          ? <div className="auth-loading"><img src="/assets/brand/main-logo.webp" alt="루멘왕국, 공주의 하루"/><span>공주님의 왕국 기록을 불러오고 있어요...</span></div>
          : <AppRouter demoMode={guestMode && !session} onResetDemo={resetDemo} onSignOut={signOut}/>
    }
  </BrowserRouter>
}

export default App
