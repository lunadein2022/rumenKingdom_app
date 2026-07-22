import { useEffect, useState } from 'react'
import { readAccountStorage, writeAccountStorage } from './accountScope'

export const PRINCESS_STORAGE_NAME = 'rumen-selected-princess'
export const PRINCESS_CHANGED_EVENT = 'rumen-princess-changed'

export type PrincessId = 'default' | 'winter' | 'cold' | 'composed' | 'veiled' | 'intellectual' | 'pure' | 'gentle' | 'majestic' | 'brave' | 'fatal' | 'warrior' | 'humble' | 'lively'

export type PrincessOption = {
  id: PrincessId
  name: string
  description: string
  fullBody: string
  avatar: string
  avatarFallback?: boolean
}

export const princessOptions: PrincessOption[] = [
  { id: 'default', name: '루멘의 공주', description: '별빛을 품은 기본 공주', fullBody: '/assets/characters/princess-full.webp', avatar: '/assets/characters/princess-bust.webp' },
  { id: 'winter', name: '겨울의 공주', description: '눈꽃처럼 맑고 우아하게', fullBody: '/assets/princesses/full/winter.webp', avatar: '/assets/princesses/avatars/winter.webp' },
  { id: 'cold', name: '차가운 공주', description: '고요한 지성과 품격', fullBody: '/assets/princesses/full/cold.webp', avatar: '/assets/princesses/avatars/cold.webp' },
  { id: 'composed', name: '냉정한 공주', description: '흔들림 없는 보랏빛 카리스마', fullBody: '/assets/princesses/full/composed.webp', avatar: '/assets/princesses/avatars/composed.webp' },
  { id: 'veiled', name: '가려진 공주', description: '신비로운 은빛 베일', fullBody: '/assets/princesses/full/veiled.webp', avatar: '/assets/princesses/avatars/veiled.webp' },
  { id: 'intellectual', name: '지적인 공주', description: '책과 지혜를 사랑하는 공주', fullBody: '/assets/princesses/full/intellectual.webp', avatar: '/assets/princesses/avatars/intellectual.webp' },
  { id: 'pure', name: '순수한 공주', description: '봄꽃처럼 사랑스러운 마음', fullBody: '/assets/princesses/full/pure.webp', avatar: '/assets/princesses/avatars/pure.webp' },
  { id: 'gentle', name: '온화한 공주', description: '따뜻한 햇살 같은 미소', fullBody: '/assets/princesses/full/gentle.webp', avatar: '/assets/princesses/avatars/gentle.webp' },
  { id: 'majestic', name: '위엄 있는 공주', description: '왕국을 이끄는 붉은 품격', fullBody: '/assets/princesses/full/majestic.webp', avatar: '/assets/princesses/avatars/majestic.webp' },
  { id: 'brave', name: '용감한 공주', description: '검을 든 은빛 수호자', fullBody: '/assets/princesses/full/brave.webp', avatar: '/assets/princesses/avatars/brave.webp' },
  { id: 'fatal', name: '치명적인 공주', description: '붉은 장미의 매혹', fullBody: '/assets/princesses/full/fatal.webp', avatar: '/assets/princesses/avatars/fatal.webp' },
  { id: 'warrior', name: '공주 전사', description: '얼음 왕관의 굳센 기사', fullBody: '/assets/princesses/full/warrior.webp', avatar: '/assets/princesses/avatars/warrior.webp' },
  { id: 'humble', name: '소박한 공주', description: '들꽃을 닮은 편안한 하루', fullBody: '/assets/princesses/full/humble.webp', avatar: '/assets/princesses/avatars/humble.webp' },
  { id: 'lively', name: '발랄한 공주', description: '햇살처럼 생기 넘치는 공주', fullBody: '/assets/princesses/full/lively.webp', avatar: '/assets/princesses/avatars/lively.webp' },
]

const princessById = new Map(princessOptions.map((item) => [item.id, item]))

export function normalizePrincessId(value?: string | null): PrincessId {
  return value && princessById.has(value as PrincessId) ? value as PrincessId : 'default'
}

export function getPrincess(value?: string | null) {
  return princessById.get(normalizePrincessId(value)) ?? princessOptions[0]
}

export function readSelectedPrincessId() {
  return normalizePrincessId(readAccountStorage(PRINCESS_STORAGE_NAME))
}

export function storeSelectedPrincessId(value: PrincessId) {
  const id = normalizePrincessId(value)
  writeAccountStorage(PRINCESS_STORAGE_NAME, id)
  window.dispatchEvent(new CustomEvent<PrincessId>(PRINCESS_CHANGED_EVENT, { detail: id }))
  return id
}

export function useSelectedPrincess() {
  const [id, setId] = useState<PrincessId>(() => readSelectedPrincessId())
  useEffect(() => {
    const listener = (event: Event) => setId(normalizePrincessId((event as CustomEvent<string>).detail))
    window.addEventListener(PRINCESS_CHANGED_EVENT, listener)
    return () => window.removeEventListener(PRINCESS_CHANGED_EVENT, listener)
  }, [])
  return getPrincess(id)
}
