import type { FormEvent, ReactNode } from 'react'
import { X } from 'lucide-react'
import { BodyAreaOverlay } from './BodyAreaOverlay'

export function ModalShell({ eyebrow, title, onClose, onSubmit, children, actions }: { eyebrow: string; title: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; children: ReactNode; actions: ReactNode }) {
  return <BodyAreaOverlay onClose={onClose}><form className="modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="shared-modal-title" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">{eyebrow}</span><h2 id="shared-modal-title">{title}</h2></div><button type="button" aria-label="닫기" onClick={onClose}><X size={18}/></button></div>{children}<div className="modal-actions">{actions}</div></form></BodyAreaOverlay>
}
