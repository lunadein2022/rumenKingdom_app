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
  const [guestMode, setGuestMode] = useState(() => sessionStorage.getItem('rumen-guest-mode') === 'true')

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setAuthReady(true) })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => { if (session || guestMode) void hydrateEvents() }, [guestMode, hydrateEvents, session])

  const enterGuest = () => { sessionStorage.setItem('rumen-guest-mode', 'true'); setGuestMode(true) }
  const signOut = async () => { if (session) await supabase?.auth.signOut(); sessionStorage.removeItem('rumen-guest-mode'); setGuestMode(false); setSession(null) }
  return <BrowserRouter>
    {!authReady ? <div className="auth-loading"><img src="/assets/brand/main-logo.webp" alt="루멘왕국, 공주의 하루"/><span>왕실 문을 준비하고 있어요...</span></div>
      : !session && !guestMode ? <LoginScreen onGuest={enterGuest}/>
        : <AppRouter onSignOut={signOut}/>} 
  </BrowserRouter>
}

export default App
