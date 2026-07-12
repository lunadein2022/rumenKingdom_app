import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './app/AppRouter'
import { LoginScreen } from './components/LoginScreen'
import { supabase } from './lib/supabase'
import { useKingdomStore } from './store'

function App() {
  const hydrateEvents = useKingdomStore((state) => state.hydrateEvents)
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [authNotice, setAuthNotice] = useState('')
  const [guestMode, setGuestMode] = useState(() => sessionStorage.getItem('rumen-guest-mode') === 'true')

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
  useEffect(() => { if (session || guestMode) void hydrateEvents() }, [guestMode, hydrateEvents, session])

  const enterGuest = () => { sessionStorage.setItem('rumen-guest-mode', 'true'); setGuestMode(true) }
  const signOut = async () => { if (session) await supabase?.auth.signOut(); sessionStorage.removeItem('rumen-guest-mode'); setGuestMode(false); setSession(null) }
  return <BrowserRouter>
    {!authReady ? <div className="auth-loading"><img src="/assets/brand/main-logo.webp" alt="루멘왕국, 공주의 하루"/><span>왕실 문을 준비하고 있어요...</span></div>
      : !session && !guestMode ? <LoginScreen onGuest={enterGuest} initialMessage={authNotice}/>
        : <AppRouter onSignOut={signOut}/>} 
  </BrowserRouter>
}

export default App
