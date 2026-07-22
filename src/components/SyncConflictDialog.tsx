import { useEffect, useState } from 'react'
import { GitMerge, RotateCcw, Server, Smartphone, X } from 'lucide-react'
import { BodyAreaOverlay } from './BodyAreaOverlay'
import { resolveSyncConflict, type SyncConflictDetail } from '../lib/syncEngine'

export function SyncConflictDialog() {
  const [detail, setDetail] = useState<SyncConflictDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const listener = (event: Event) => {
      const value = (event as CustomEvent<SyncConflictDetail>).detail
      if (value?.item && value?.response) setDetail(value)
    }
    window.addEventListener('rumen-sync-conflict', listener)
    return () => window.removeEventListener('rumen-sync-conflict', listener)
  }, [])
  if (!detail) return null
  const deleted = detail.response.status === 'not_found'
  const finish = async (strategy: 'server' | 'local' | 'merge' | 'restore') => {
    setBusy(true); setError('')
    try {
      await resolveSyncConflict(detail, strategy)
      setDetail(null)
      window.dispatchEvent(new Event('rumen-sync-resolved'))
    } catch (reason) { setError(reason instanceof Error ? reason.message : '충돌을 해결하지 못했어요.') }
    finally { setBusy(false) }
  }
  return <BodyAreaOverlay onClose={() => { if (!busy) setDetail(null) }}>
    <section className="sync-conflict modal" role="dialog" aria-modal="true" aria-labelledby="sync-conflict-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>SYNC CONFLICT</span><h2 id="sync-conflict-title">{deleted ? '다른 기기에서 삭제된 기록이에요' : '두 기기의 수정이 겹쳐요'}</h2></div><button aria-label="닫기" onClick={() => setDetail(null)}><X/></button></header>
      <p>{deleted ? '이 기기의 내용으로 복원할지, 삭제 상태를 유지할지 선택해 주세요.' : '서로 다른 항목은 자동으로 합칠 수 있고, 같은 항목은 원하는 쪽을 선택할 수 있어요.'}</p>
      {!deleted && <div className="sync-compare"><RecordPreview title="서버의 최신 내용" value={detail.response.serverRecord}/><RecordPreview title="이 기기의 수정" value={detail.item.payload}/></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="sync-conflict-actions">
        {deleted ? <><button disabled={busy} onClick={() => void finish('server')}><Server/>삭제 유지</button><button className="primary" disabled={busy} onClick={() => void finish('restore')}><RotateCcw/>이 내용으로 복원</button></>
          : <><button disabled={busy} onClick={() => void finish('server')}><Server/>서버 내용 사용</button><button disabled={busy} onClick={() => void finish('local')}><Smartphone/>이 기기 내용 사용</button><button className="primary" disabled={busy} onClick={() => void finish('merge')}><GitMerge/>자동으로 합치기</button></>}
      </div>
    </section>
  </BodyAreaOverlay>
}

function RecordPreview({ title, value }: { title: string; value?: Record<string, unknown> }) {
  const entries = Object.entries(value ?? {}).filter(([key]) => !['user_id', 'id'].includes(key)).slice(0, 12)
  return <article><h3>{title}</h3>{entries.length ? entries.map(([key, current]) => <p key={key}><b>{key}</b><span>{current == null ? '—' : typeof current === 'object' ? JSON.stringify(current) : String(current)}</span></p>) : <small>비교할 내용이 없어요.</small>}</article>
}
