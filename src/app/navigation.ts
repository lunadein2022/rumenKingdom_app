import { BookOpen, CalendarDays, Flower2, Home, LibraryBig, ListChecks } from 'lucide-react'
import type { PageId } from '../types'

export const pagePaths: Record<PageId, string> = {
  lobby: '/', office: '/office', calendar: '/calendar', library: '/library', diary: '/diary', garden: '/garden', rita: '/rita', throne: '/throne',
}

export const navigation = [
  { id: 'lobby', path: '/', label: '로비', icon: Home },
  { id: 'office', path: '/office', label: '집무실', icon: ListChecks },
  { id: 'calendar', path: '/calendar', label: '왕실 일정표', icon: CalendarDays },
  { id: 'library', path: '/library', label: '왕국 도서관', icon: LibraryBig },
  { id: 'diary', path: '/diary', label: '공주의 침실', icon: BookOpen },
  { id: 'garden', path: '/garden', label: '루멘 비밀정원', icon: Flower2 },
] satisfies { id: PageId; path: string; label: string; icon: typeof Home }[]

export const pageCopy: Record<PageId, { eyebrow: string; title: string; description: string }> = {
  lobby: { eyebrow: 'ROYAL LOBBY', title: '좋은 아침이에요, 공주님', description: '오늘의 일정과 퀘스트를 한눈에 살펴보세요.' },
  office: { eyebrow: 'ROYAL OFFICE', title: '집무실', description: '메인 퀘스트의 흐름과 이번 주 업무를 관리합니다.' },
  calendar: { eyebrow: 'ROYAL CALENDAR', title: '왕실 일정표', description: '공주의 하루를 계획하고, 중요한 일정을 한눈에 확인하세요.' },
  library: { eyebrow: 'KINGDOM ARCHIVE', title: '왕국 도서관', description: '루멘왕국의 모든 기록이 보관되는 곳입니다.' },
  diary: { eyebrow: 'PRINCESS CHAMBER', title: '공주의 침실', description: '오늘의 마음과 기억을 조용히 기록해 보세요.' },
  garden: { eyebrow: 'SECRET GARDEN', title: '루멘 비밀정원', description: '잠시 숨을 고르고, 고요한 빛 속에서 쉬어가세요.' },
  rita: { eyebrow: 'ROYAL MAID', title: '리타와 대화하기', description: '일정과 퀘스트부터 메모까지 무엇이든 말씀해 주세요.' },
  throne: { eyebrow: 'THRONE ROOM', title: '왕좌의 방', description: '공주의 계정과 왕국의 연결 상태를 관리합니다.' },
}

export function pageIdFromPath(pathname: string): PageId {
  if (pathname.startsWith('/office')) return 'office'
  if (pathname.startsWith('/calendar')) return 'calendar'
  if (pathname.startsWith('/library')) return 'library'
  if (pathname.startsWith('/diary')) return 'diary'
  if (pathname.startsWith('/garden')) return 'garden'
  if (pathname.startsWith('/rita')) return 'rita'
  if (pathname.startsWith('/throne')) return 'throne'
  return 'lobby'
}
