import { supabase } from '../lib/supabase'
import { readAccountStorage } from '../lib/accountScope'
import { Capacitor } from '@capacitor/core'
import { disableNativePush, enableNativePush } from './nativePushService'

export async function enableWebPush() {
  if (Capacitor.isNativePlatform()) return enableNativePush()
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('이 브라우저는 웹 푸시 알림을 지원하지 않아요.')
  const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined
  if (!publicKey) throw new Error('웹 푸시 서버 키가 아직 설정되지 않았어요.')
  if (!supabase) throw new Error('Supabase가 설정되지 않았어요.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('브라우저 알림 권한이 필요해요.')
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(publicKey) })
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('푸시 구독 정보를 만들지 못했어요.')
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth_key: json.keys.auth,
    user_agent: navigator.userAgent.slice(0, 500),
    enabled: true,
    enabled_at: new Date().toISOString(),
  }, { onConflict: 'user_id,endpoint' })
  if (error) throw error
  return true
}

export async function disableWebPush() {
  if (Capacitor.isNativePlatform()) { await disableNativePush(); return }
  if (!('serviceWorker' in navigator) || !supabase) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').update({ enabled: false }).eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}

export async function requestWebPushForFirstReminder() {
  if (readAccountStorage('rumen-in-app-notifications') === 'off') return false
  if (!import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY || typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
  return enableWebPush().catch(() => false)
}

function urlBase64ToBytes(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const binary = atob((value + padding).replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}
