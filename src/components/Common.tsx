import { ChevronRight, Inbox } from 'lucide-react'

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="section-title"><h2>{title}</h2>{action && <button onClick={onAction}>{action}<ChevronRight size={13}/></button>}</div>
}

export function Metric({ label, value, tone, note = '이번 주' }: { label: string; value: string; tone: string; note?: string }) {
  return <div className={`metric glass-panel ${tone}`}><span>{label}</span><b>{value}</b><small>{note}</small></div>
}

export function EmptyState({ title, description, action, onAction }: { title: string; description?: string; action?: string; onAction?: () => void }) {
  return <div className="feature-empty"><Inbox size={30}/><b>{title}</b>{description && <p>{description}</p>}{action && onAction && <button onClick={onAction}>{action}</button>}</div>
}
