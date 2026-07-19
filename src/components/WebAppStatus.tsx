import { useEffect, useState } from 'react'
import { Download, RefreshCw, WifiOff, X } from 'lucide-react'
import { flushSyncQueue, pendingSyncCount } from '../lib/syncEngine'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const INSTALL_DISMISSED_KEY = 'rumen-pwa-install-dismissed'
const installWasDismissed = () => {
  try { return localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true' } catch { return false }
}

export function WebAppStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installDismissed, setInstallDismissed] = useState(installWasDismissed)
  const [queued, setQueued] = useState(pendingSyncCount)

  useEffect(() => {
    const connected = () => setOnline(true)
    const disconnected = () => setOnline(false)
    window.addEventListener('online', connected)
    window.addEventListener('offline', disconnected)
    return () => { window.removeEventListener('online', connected); window.removeEventListener('offline', disconnected) }
  }, [])

  useEffect(() => {
    const changed = (event: Event) => setQueued((event as CustomEvent<{ pending?: number }>).detail?.pending ?? pendingSyncCount())
    window.addEventListener('rumen-sync-queued', changed)
    window.addEventListener('rumen-sync-queue-changed', changed)
    window.addEventListener('rumen-sync-flushed', changed)
    return () => { window.removeEventListener('rumen-sync-queued', changed); window.removeEventListener('rumen-sync-queue-changed', changed); window.removeEventListener('rumen-sync-flushed', changed) }
  }, [])

  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', capture)
    return () => window.removeEventListener('beforeinstallprompt', capture)
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
    let active = true
    let registration: ServiceWorkerRegistration | undefined
    const inspect = (worker: ServiceWorker | null) => {
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (active && worker.state === 'installed' && navigator.serviceWorker.controller) setWaitingWorker(worker)
      })
    }
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((next) => {
      if (!active) return
      registration = next
      if (next.waiting) setWaitingWorker(next.waiting)
      next.addEventListener('updatefound', () => inspect(next.installing))
    }).catch(() => undefined)
    const checkUpdate = () => { if (document.visibilityState === 'visible') void registration?.update() }
    document.addEventListener('visibilitychange', checkUpdate)
    return () => { active = false; document.removeEventListener('visibilitychange', checkUpdate) }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let reloading = false
    const reload = () => { if (!reloading) { reloading = true; window.location.reload() } }
    navigator.serviceWorker.addEventListener('controllerchange', reload)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', reload)
  }, [])

  if (!online) return <aside className="webapp-status offline" role="status"><WifiOff size={16}/><span><b>오프라인 상태</b><small>{queued ? `작성한 기록 ${queued}건은 연결되면 자동으로 전송돼요.` : '연결이 돌아오면 최신 기록을 자동으로 확인해요.'}</small></span></aside>
  if (queued > 0) return <aside className="webapp-status update" role="status"><RefreshCw size={16}/><span><b>동기화 대기 {queued}건</b><small>연결이 불안정해 저장을 다시 시도하고 있어요.</small></span><button onClick={() => void flushSyncQueue().finally(() => setQueued(pendingSyncCount()))}>지금 재시도</button></aside>
  if (waitingWorker) return <aside className="webapp-status update" role="status"><RefreshCw size={16}/><span><b>새 왕국 버전이 준비됐어요</b><small>안전하게 새로고침해 적용할 수 있어요.</small></span><button onClick={() => waitingWorker.postMessage({ type: 'SKIP_WAITING' })}>업데이트</button></aside>
  if (installPrompt && !installDismissed) return <aside className="webapp-status install" role="status"><Download size={16}/><span><b>홈 화면에 왕국 설치</b><small>브라우저 없이 앱처럼 바로 열 수 있어요.</small></span><button onClick={() => void installPrompt.prompt().then(() => installPrompt.userChoice).then(() => setInstallPrompt(null))}>설치</button><button className="webapp-status-close" aria-label="설치 안내 닫기" onClick={() => { try { localStorage.setItem(INSTALL_DISMISSED_KEY, 'true') } catch { /* 현재 화면에서만 닫기 */ }; setInstallDismissed(true) }}><X size={13}/></button></aside>
  return null
}
