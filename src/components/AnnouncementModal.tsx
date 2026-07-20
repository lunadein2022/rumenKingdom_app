import { AlertTriangle, Megaphone, ShieldAlert, X } from 'lucide-react'
import { BodyAreaOverlay } from './BodyAreaOverlay'
import { useNotificationCenter } from '../features/notifications/notificationContext'

const severityIcon = { info: Megaphone, warning: AlertTriangle, critical: ShieldAlert }

export function AnnouncementModal() {
  const { notifications, notificationsEnabled, markRead } = useNotificationCenter()
  if (!notificationsEnabled) return null
  const next = notifications.find((item) => item.id.startsWith('announcement:') && !item.read)
  if (!next) return null

  const close = () => markRead(next)
  const Icon = severityIcon[next.severity ?? 'info']

  return <BodyAreaOverlay className="modal-backdrop announcement-backdrop" onClose={close}>
    <section className={`modal glass-panel announcement-modal ${next.severity ?? 'info'}`} role="dialog" aria-modal="true" aria-labelledby="announcement-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-head">
        <div><span className="eyebrow">왕실 공지</span><h2 id="announcement-title"><Icon size={19}/> {next.title}</h2></div>
        <button type="button" aria-label="닫기" onClick={close}><X size={18}/></button>
      </div>
      <p className="announcement-message">{next.summary}</p>
      <div className="modal-actions">
        {next.actionUrl && <a className="ghost" href={next.actionUrl} target="_blank" rel="noreferrer" onClick={close}>{next.actionLabel || '자세히 보기'}</a>}
        <button type="button" className="primary" onClick={close}>확인</button>
      </div>
    </section>
  </BodyAreaOverlay>
}
