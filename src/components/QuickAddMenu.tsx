import { useState } from 'react'
import { CalendarDays, NotebookPen, Plus, ScrollText, Sword, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function QuickAddMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const go = (path: string, state?: unknown) => { setOpen(false); navigate(path, { state }) }
  return <aside className={`quick-add ${open ? 'open' : ''}`}><button className="quick-add-main" aria-label={open ? '빠른 추가 닫기' : '빠른 추가'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? <X/> : <Plus/>}<span>빠른 추가</span></button>{open && <div className="quick-add-menu glass-panel" role="menu"><button onClick={() => go('/calendar', { quickCreate: true })}><CalendarDays/>일정</button><button onClick={() => go('/office', { quickCreate: true })}><Sword/>퀘스트</button><button onClick={() => go('/library/memos/new')}><ScrollText/>비망록</button><button onClick={() => go('/diary')}><NotebookPen/>다이어리</button></div>}</aside>
}
