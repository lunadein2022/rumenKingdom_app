import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from '../lib/supabase'
import { latestPatchNote } from '../lib/patchNotes'

let listenersReady = false

export async function enableNativePush() {
  const platform = Capacitor.getPlatform()
  if (platform !== 'ios' && platform !== 'android') return false
  if (!supabase) throw new Error('Supabase가 설정되지 않았어요.')
  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') throw new Error('기기 알림 권한이 필요해요.')
  await prepareListeners(platform)
  await prepareAndroidChannel(platform)
  await PushNotifications.register()
  return true
}

export async function restoreNativePushRegistration() {
  const platform = Capacitor.getPlatform()
  if (platform !== 'ios' && platform !== 'android') return false
  const permission = await PushNotifications.checkPermissions()
  if (permission.receive !== 'granted') return false
  await prepareListeners(platform)
  await prepareAndroidChannel(platform)
  await PushNotifications.register()
  return true
}

export async function disableNativePush() {
  const platform = Capacitor.getPlatform()
  if ((platform !== 'ios' && platform !== 'android') || !supabase) return false
  const { error } = await supabase.rpc('disable_my_native_push_devices', { p_platform: platform })
  if (error) throw error
  await PushNotifications.unregister().catch(() => undefined)
  return true
}

async function prepareListeners(platform: 'ios' | 'android') {
  if (listenersReady) return
  listenersReady = true
  await PushNotifications.addListener('registration', async ({ value: token }) => {
    const { error } = await supabase?.rpc('register_my_native_push_device', {
      p_platform: platform, p_token: token, p_app_version: latestPatchNote.version, p_locale: navigator.language || 'ko-KR',
    }) ?? { error: new Error('Supabase not configured') }
    if (error) console.warn('Native push token registration failed')
  })
  await PushNotifications.addListener('registrationError', () => console.warn('Native push registration failed'))
  await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const path = typeof notification.data?.path === 'string' ? notification.data.path : '/notifications'
    window.location.assign(path.startsWith('/') ? path : '/notifications')
  })
}

async function prepareAndroidChannel(platform: 'ios' | 'android') {
  if (platform !== 'android') return
  await PushNotifications.createChannel({
    id: 'rumen_reminders',
    name: '왕실 일정 알림',
    description: '일정과 퀘스트 시작 전에 알려드려요.',
    importance: 4,
    visibility: 1,
    vibration: true,
  })
}
