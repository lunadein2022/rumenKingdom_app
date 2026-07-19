import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { latestPatchNote } from '../lib/patchNotes'
import { serviceDate } from '../lib/serviceTime'
import { BodyAreaOverlay } from './BodyAreaOverlay'
import { loadLatestPatchNote } from '../services/releaseNotesService'
import type { PatchNote } from '../lib/patchNotes'
import { NavLink } from 'react-router-dom'

const DISMISS_KEY = 'rumen-patchnotes-dismissed-version'
const SNOOZE_KEY = 'rumen-patchnotes-snooze-date'

function shouldShow(note: PatchNote): boolean {
  try {
    if (localStorage.getItem(DISMISS_KEY) === note.version) return false
    if (localStorage.getItem(SNOOZE_KEY) === serviceDate()) return false
  } catch { /* 저장소 접근 불가 시 그냥 표시 */ }
  return true
}

export function PatchNotesModal() {
  const [note, setNote] = useState(latestPatchNote)
  const [open, setOpen] = useState(() => shouldShow(latestPatchNote))
  useEffect(() => {
    let active = true
    void loadLatestPatchNote('web').then((latest) => {
      if (!active) return
      setNote(latest)
      setOpen(shouldShow(latest))
    })
    return () => { active = false }
  }, [])
  if (!open) return null

  const close = () => setOpen(false)
  const snoozeToday = () => {
    try { localStorage.setItem(SNOOZE_KEY, serviceDate()) } catch { /* 무시 */ }
    close()
  }
  const dismissForever = () => {
    try { localStorage.setItem(DISMISS_KEY, note.version) } catch { /* 무시 */ }
    close()
  }

  return <BodyAreaOverlay className="modal-backdrop patchnotes-backdrop" onClose={close}>
    <section className="modal glass-panel patchnotes-modal" role="dialog" aria-modal="true" aria-labelledby="patchnotes-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-head">
        <div>
          <span className="eyebrow">PATCH NOTES · v{note.version}</span>
          <h2 id="patchnotes-title"><Sparkles size={17}/> {note.title}</h2>
        </div>
        <button type="button" aria-label="닫기" onClick={close}><X size={18}/></button>
      </div>
      <ul className="patchnotes-list">
        {note.items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
      <div className="patchnotes-actions">
        <NavLink className="patchnotes-all" to="/patch-notes" onClick={close}>전체 업데이트 보기</NavLink>
        <button type="button" className="ghost" onClick={snoozeToday}>오늘 안 보기</button>
        <button type="button" className="ghost" onClick={dismissForever}>아예 안 보기</button>
        <button type="button" className="primary" onClick={close}>확인</button>
      </div>
    </section>
  </BodyAreaOverlay>
}
