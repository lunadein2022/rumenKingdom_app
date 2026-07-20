import { createContext, useContext } from 'react'

export type KingdomNotification = {
  id: string
  title: string
  summary: string
  path: string
  read: boolean
  createdAt: string
  remoteId?: string
  severity?: 'info' | 'warning' | 'critical'
  actionLabel?: string
  actionUrl?: string
}

export type NotificationCenterValue = {
  notifications: KingdomNotification[]
  notificationsEnabled: boolean
  unreadCount: number
  markRead: (item: KingdomNotification) => void
  markAllRead: () => void
}

export const NotificationCenterContext = createContext<NotificationCenterValue | null>(null)

export function useNotificationCenter() {
  const value = useContext(NotificationCenterContext)
  if (!value) throw new Error('NotificationCenterProvider가 필요합니다.')
  return value
}
