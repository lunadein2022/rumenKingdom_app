import { useEffect, type ReactNode } from 'react'

let openOverlayCount = 0

export function BodyAreaOverlay({ children, className = 'modal-backdrop', onClose }: { children: ReactNode; className?: string; onClose: () => void }) {
  useEffect(() => {
    openOverlayCount += 1
    document.body.classList.add('body-overlay-open')
    return () => {
      openOverlayCount = Math.max(0, openOverlayCount - 1)
      if (openOverlayCount === 0) document.body.classList.remove('body-overlay-open')
    }
  }, [])

  return <div className={className} onMouseDown={onClose}>{children}</div>
}
