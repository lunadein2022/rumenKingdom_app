import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useKingdomStore } from '../../store'
import { useServiceDate } from '../../lib/useServiceDate'
import { accountStorage, accountStorageKey, readAccountStorage } from '../../lib/accountScope'
import {
  loadAccountNotifications,
  markAccountNotificationRead,
  markAccountNotificationsRead,
  type AccountNotification,
} from '../../services/notificationService'
import { useRuntimeConfig } from '../runtime/RuntimeConfig'
import { NotificationCenterContext, type KingdomNotification } from './notificationContext'

export function NotificationCenterProvider({ demoMode, children }: { demoMode: boolean; children: ReactNode }) {
  const { events, quests, memos } = useKingdomStore()
  const serviceToday = useServiceDate()
  const { announcements } = useRuntimeConfig()
  const storage = accountStorage()
  const readKey = accountStorageKey('rumen-read-notifications')
  const [remoteNotifications, setRemoteNotifications] = useState<AccountNotification[]>([])
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => readAccountStorage('rumen-in-app-notifications') !== 'off')
  const [readLocalIds, setReadLocalIds] = useState<string[]>(() => {
    try { return JSON.parse(storage.getItem(readKey) ?? '[]') as string[] } catch { return [] }
  })

  useEffect(() => {
    const listener = (event: Event) => setNotificationsEnabled((event as CustomEvent<boolean>).detail)
    window.addEventListener('rumen-notification-setting', listener)
    return () => window.removeEventListener('rumen-notification-setting', listener)
  }, [])

  useEffect(() => {
    if (demoMode) return
    let active = true
    const refresh = () => void loadAccountNotifications(100)
      .then((items) => { if (active) setRemoteNotifications(items) })
      .catch(() => undefined)
    refresh()
    const interval = window.setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    window.addEventListener('rumen-notifications-changed', refresh)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('rumen-notifications-changed', refresh)
    }
  }, [demoMode])

  const notifications = useMemo<KingdomNotification[]>(() => [
    ...announcements.map((item) => {
      const id = `announcement:${item.id}`
      return {
        id,
        title: item.title,
        summary: item.message,
        path: '/',
        read: readLocalIds.includes(id),
        createdAt: item.updatedAt || item.startsAt,
        severity: item.severity,
        actionLabel: item.actionLabel,
        actionUrl: item.actionUrl,
      }
    }),
    ...remoteNotifications.map((item) => ({
      id: `server:${item.id}`,
      remoteId: item.id,
      title: item.title,
      summary: item.body,
      path: '/throne',
      read: Boolean(item.readAt),
      createdAt: item.createdAt,
    })),
    ...events
      .filter((event) => event.date <= serviceToday && (event.endDate ?? event.date) >= serviceToday)
      .map((event) => {
        const id = `event:${event.id}:${serviceToday}`
        return {
          id,
          title: event.title,
          summary: event.allDay ? '오늘 · 종일' : `오늘 ${event.start || '시간 미정'}`,
          path: `/calendar/event/${event.id}`,
          read: readLocalIds.includes(id),
          createdAt: `${serviceToday}T${event.start || '00:00'}:00`,
        }
      }),
    ...quests.flatMap((quest) => {
      const due = quest.scheduledDate
      const id = `quest:${quest.id}:${due}`
      return !quest.done && due && due <= serviceToday ? [{
        id,
        title: quest.title,
        summary: due < serviceToday ? '마감일 지남' : `오늘 ${quest.scheduledTime ?? '마감'}`,
        path: `/library/item/${encodeURIComponent(`${quest.type === 'daily' ? 'dailyQuest' : 'subQuest'}:${quest.id}`)}`,
        read: readLocalIds.includes(id),
        createdAt: `${due}T${quest.scheduledTime || '00:00'}:00`,
      }] : []
    }),
    ...memos.filter((memo) => memo.status === 'review').map((memo) => {
      const id = `memo:${memo.id}`
      return {
        id,
        title: memo.title,
        summary: '확인 필요 비망록',
        path: `/library/memos/${memo.id}`,
        read: readLocalIds.includes(id),
        createdAt: memo.createdAt,
      }
    }),
  ].sort((a, b) => Number(a.read) - Number(b.read) || b.createdAt.localeCompare(a.createdAt)), [announcements, events, memos, quests, readLocalIds, remoteNotifications, serviceToday])

  const unreadCount = notificationsEnabled ? notifications.filter((item) => !item.read).length : 0

  const markRead = (item: KingdomNotification) => {
    if (item.read) return
    if (item.remoteId) {
      setRemoteNotifications((current) => current.map((entry) => entry.id === item.remoteId ? { ...entry, readAt: new Date().toISOString() } : entry))
      void markAccountNotificationRead(item.remoteId).catch(() => undefined)
      return
    }
    const next = Array.from(new Set([...readLocalIds, item.id]))
    setReadLocalIds(next)
    try { storage.setItem(readKey, JSON.stringify(next)) } catch { /* 저장소 접근 실패 시 현재 화면 상태만 유지 */ }
  }

  const markAllRead = () => {
    const localIds = notifications.filter((item) => !item.remoteId).map((item) => item.id)
    const remoteIds = notifications.flatMap((item) => item.remoteId ? [item.remoteId] : [])
    const next = Array.from(new Set([...readLocalIds, ...localIds]))
    setReadLocalIds(next)
    try { storage.setItem(readKey, JSON.stringify(next)) } catch { /* 저장소 접근 실패 시 현재 화면 상태만 유지 */ }
    setRemoteNotifications((current) => current.map((item) => remoteIds.includes(item.id) ? { ...item, readAt: new Date().toISOString() } : item))
    void markAccountNotificationsRead(remoteIds).catch(() => undefined)
  }

  return <NotificationCenterContext.Provider value={{ notifications, notificationsEnabled, unreadCount, markRead, markAllRead }}>
    {children}
  </NotificationCenterContext.Provider>
}
