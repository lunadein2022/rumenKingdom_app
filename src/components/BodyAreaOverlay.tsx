import { useEffect, useRef, type ReactNode } from 'react'

let openOverlayCount = 0

export function BodyAreaOverlay({ children, className = 'modal-backdrop', onClose }: { children: ReactNode; className?: string; onClose: () => void }) {
  const overlay = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    openOverlayCount += 1
    document.body.classList.add('body-overlay-open')
    const focusable = () => Array.from(overlay.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? [])
    window.setTimeout(() => (focusable()[0] ?? overlay.current)?.focus(), 0)
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) { event.preventDefault(); overlay.current?.focus(); return }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown)
      openOverlayCount = Math.max(0, openOverlayCount - 1)
      if (openOverlayCount === 0) document.body.classList.remove('body-overlay-open')
      previous?.focus()
    }
  }, [])

  return <div ref={overlay} className={className} role="presentation" tabIndex={-1} onMouseDown={onClose}>{children}</div>
}
