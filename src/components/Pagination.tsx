import { useCallback, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const PAGE_SIZE = 20

type PageState = { key: string; page: number }

export function usePaginatedList<T>(items: T[], key = 'default', pageSize = PAGE_SIZE) {
  const [state, setState] = useState<PageState>({ key, page: 1 })
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const page = state.key === key ? Math.min(Math.max(state.page, 1), totalPages) : 1
  const visibleItems = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize])
  const setPage = useCallback((nextPage: number) => {
    setState({ key, page: Math.min(Math.max(nextPage, 1), totalPages) })
  }, [key, totalPages])
  return { page, pageSize, totalPages, totalItems: items.length, visibleItems, setPage }
}

export function Pagination({ page, totalItems, onPageChange, label = '목록' }: { page: number; totalItems: number; onPageChange: (page: number) => void; label?: string }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  if (totalItems <= PAGE_SIZE) return null
  const first = (page - 1) * PAGE_SIZE + 1
  const last = Math.min(page * PAGE_SIZE, totalItems)
  return <nav className="common-pagination" aria-label={`${label} 페이지`}>
    <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={15}/>이전</button>
    <span><b>{page} / {totalPages}</b><small>{first}–{last} · 총 {totalItems}건</small></span>
    <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>다음<ChevronRight size={15}/></button>
  </nav>
}
