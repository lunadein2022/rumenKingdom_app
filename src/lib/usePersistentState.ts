import { useEffect, useRef, useState } from 'react'

/**
 * useState와 동일하게 쓰되, 값을 sessionStorage에 자동 저장/복원한다.
 * 다른 페이지로 이동해 컴포넌트가 언마운트됐다가 돌아와도 작성 중이던 값이 유지된다.
 * key가 null이면 저장하지 않고 일반 useState처럼 동작한다.
 */
export function usePersistentState<T>(key: string | null, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (!key) return initial
    try {
      const raw = sessionStorage.getItem(key)
      return raw != null ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  // 첫 렌더에서 초기값을 즉시 다시 쓰지 않도록 살짝 지연.
  const hydrated = useRef(false)
  useEffect(() => {
    if (!key) return
    if (!hydrated.current) { hydrated.current = true; return }
    try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* 저장 실패는 무시 */ }
  }, [key, value])

  return [value, setValue] as const
}

/** 저장 완료 등으로 더 이상 임시 저장이 필요 없을 때 해당 키를 지운다. */
export function clearPersistentState(...keys: (string | null | undefined)[]) {
  for (const key of keys) {
    if (!key) continue
    try { sessionStorage.removeItem(key) } catch { /* 무시 */ }
  }
}
