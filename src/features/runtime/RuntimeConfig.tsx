/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, ShieldAlert, X } from 'lucide-react'
import { compareVersions, currentAppVersion, currentPlatform, fallbackRuntimeConfig, loadAppBootstrap, type AppBootstrap } from '../../services/runtimeConfigService'

type RuntimeContextValue = AppBootstrap & { loading: boolean; refresh: () => Promise<void>; featureEnabled: (key: string) => boolean }
const fallback: AppBootstrap = { config: fallbackRuntimeConfig, announcements: [], catalog: [], releases: [], source: 'fallback' }
const RuntimeContext = createContext<RuntimeContextValue>({ ...fallback, loading: true, refresh: async () => undefined, featureEnabled: () => true })

export function RuntimeConfigProvider({ children }: { children: React.ReactNode }) {
  const [bootstrap, setBootstrap] = useState<AppBootstrap>(fallback)
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => { const next = await loadAppBootstrap(); setBootstrap(next); setLoading(false) }, [])
  useEffect(() => {
    let active = true
    void loadAppBootstrap().then((next) => { if (active) { setBootstrap(next); setLoading(false) } })
    const interval = window.setInterval(() => void refresh(), 5 * 60_000)
    const visible = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('online', refresh); document.addEventListener('visibilitychange', visible)
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', visible) }
  }, [refresh])
  const value = useMemo<RuntimeContextValue>(() => ({ ...bootstrap, loading, refresh, featureEnabled: (key) => bootstrap.config.featureFlags[key] !== false }), [bootstrap, loading, refresh])
  return <RuntimeContext.Provider value={value}>{children}<RuntimeGuard/></RuntimeContext.Provider>
}

export const useRuntimeConfig = () => useContext(RuntimeContext)

export function RuntimeNotices() {
  const { announcements, config } = useRuntimeConfig()
  const [dismissed, setDismissed] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('rumen-dismissed-announcements') ?? '[]') as string[] } catch { return [] } })
  const notices = [...(config.maintenance.enabled && !config.maintenance.blocking ? [{ id: 'maintenance-runtime', severity: 'warning' as const, title: config.maintenance.title, message: config.maintenance.message, dismissible: false }] : []), ...announcements].filter((item) => !dismissed.includes(item.id))
  if (!notices.length) return null
  return <section className="runtime-notices" aria-label="서비스 공지">{notices.map((item) => <article key={item.id} className={item.severity}><AlertTriangle size={15}/><span><b>{item.title}</b><small>{item.message}</small></span>{'actionUrl' in item && item.actionUrl && <a href={item.actionUrl}>{item.actionLabel || '자세히'}</a>}{item.dismissible && <button aria-label="공지 닫기" onClick={() => { const next = [...dismissed, item.id]; setDismissed(next); localStorage.setItem('rumen-dismissed-announcements', JSON.stringify(next.slice(-100))) }}><X size={14}/></button>}</article>)}</section>
}

function RuntimeGuard() {
  const { config, refresh } = useRuntimeConfig()
  const platform = currentPlatform(); const minimum = config.minimumVersions[platform]
  const updateRequired = Boolean(config.forceUpdate && minimum && compareVersions(currentAppVersion(), minimum) < 0)
  const maintenanceActive = config.maintenance.enabled && config.maintenance.blocking
  if (!updateRequired && !maintenanceActive) return null
  const storeUrl = platform === 'web' ? undefined : config.storeUrls[platform]
  return <div className="runtime-guard" role="alertdialog" aria-modal="true"><section className="glass-panel">{updateRequired ? <ShieldAlert size={34}/> : <AlertTriangle size={34}/>}<span className="eyebrow">{updateRequired ? 'REQUIRED UPDATE' : 'ROYAL MAINTENANCE'}</span><h1>{updateRequired ? '새 왕국 버전이 필요해요' : config.maintenance.title}</h1><p>{updateRequired ? `현재 ${currentAppVersion()} · 최소 지원 ${minimum}. 안전한 동기화를 위해 업데이트해 주세요.` : config.maintenance.message}</p>{storeUrl ? <a className="primary" href={storeUrl}>스토어에서 업데이트</a> : <button className="primary" onClick={() => platform === 'web' ? window.location.reload() : void refresh()}><RefreshCw size={15}/>다시 확인</button>}</section></div>
}
