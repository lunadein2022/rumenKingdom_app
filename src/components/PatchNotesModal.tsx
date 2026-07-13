import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { latestPatchNote } from '../lib/patchNotes'
import { serviceDate } from '../lib/serviceTime'

const DISMISS_KEY = 'rumen-patchnotes-dismissed-version'
const SNOOZE_KEY = 'rumen-patchnotes-snooze-date'

function shouldShow(): boolean {
  try {
    if (localStorage.getItem(DISMISS_KEY) === latestPatchNote.version) return false
    if (localStorage.getItem(SNOOZE_KEY) === serviceDate()) return false
  } catch { /* 저장소 접근 불가 시 그냥 표시 */ }
  return true
}

export function PatchNotesModal() {
  const [open, setOpen] = useState(false)
  useEffect(() => { setOpen(shouldShow()) }, [])
  if (!open) return null

  const close = () => setOpen(false)
  const snoozeToday = () => {
    try { localStorage.setItem(SNOOZE_KEY, serviceDate()) } catch { /* 무시 */ }
    close()
  }
  const dismissForever = () => {
    try { localStorage.setItem(DISMISS_KEY, latestPatchNote.version) } catch { /* 무시 */ }
    close()
  }

  return <div className="modal-backdrop patchnotes-backdrop" onMouseDown={close}>
    <section className="modal glass-panel patchnotes-modal" role="dialog" aria-modal="true" aria-labelledby="patchnotes-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-head">
        <div>
          <span className="eyebrow">PATCH NOTES · v{latestPatchNote.version}</span>
          <h2 id="patchnotes-title"><Sparkles size={17}/> {latestPatchNote.title}</h2>
        </div>
        <button type="button" aria-label="닫기" onClick={close}><X size={18}/></button>
      </div>
      <ul className="patchnotes-list">
        {latestPatchNote.items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
      <div className="patchnotes-actions">
        <button type="button" className="ghost" onClick={snoozeToday}>오늘 안 보기</button>
        <button type="button" className="ghost" onClick={dismissForever}>아예 안 보기</button>
        <button type="button" className="primary" onClick={close}>확인</button>
      </div>
    </section>
  </div>
}
