import { supabase } from '../lib/supabase'
import type { PageId } from '../types'

export type UserPreferences = {
  profileName: string
  profileIntro: string
  notifications: boolean
  aiStyle: 'concise' | 'warm' | 'detailed'
  timezone: string
  serviceDayStartsAt: string
}

export type RoomBackground = { room: PageId; storagePath: string; position: string; url: string }

export const defaultPreferences: UserPreferences = {
  profileName: '루멘왕국의 공주',
  profileIntro: '차분하게 왕국의 하루를 가꾸어 가는 중입니다.',
  notifications: true,
  aiStyle: 'concise',
  timezone: 'Asia/Seoul',
  serviceDayStartsAt: '06:00',
}

async function getUserId() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

export async function loadPreferences(): Promise<UserPreferences | null> {
  const userId = await getUserId()
  if (!supabase || !userId) return null
  const { data, error } = await supabase.from('user_settings').select('preferences').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return { ...defaultPreferences, ...((data?.preferences ?? {}) as Partial<UserPreferences>) }
}

export async function savePreferences(preferences: UserPreferences) {
  const userId = await getUserId()
  if (!supabase || !userId) return false
  const { error } = await supabase.from('user_settings').upsert({ user_id: userId, preferences }, { onConflict: 'user_id' })
  if (error) throw error
  return true
}

export async function loadRoomBackgrounds(): Promise<RoomBackground[]> {
  if (!supabase || !(await getUserId())) return []
  const { data, error } = await supabase.from('room_backgrounds').select('room_key,storage_path,position')
  if (error) throw error
  return Promise.all((data ?? []).map(async (row) => {
    const { data: signed } = await supabase!.storage.from('room-backgrounds').createSignedUrl(row.storage_path, 3600)
    return { room: row.room_key as PageId, storagePath: row.storage_path, position: row.position, url: signed?.signedUrl ?? '' }
  }))
}

export async function uploadRoomBackground(room: PageId, file: File): Promise<RoomBackground> {
  const userId = await getUserId()
  if (!supabase || !userId) throw new Error('로그인이 필요합니다.')
  if (file.size > 10 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('JPG, PNG, WEBP 형식의 10MB 이하 이미지만 사용할 수 있어요.')
  const extension = file.name.split('.').pop()?.toLowerCase() || 'webp'
  const path = `${userId}/${room}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage.from('room-backgrounds').upload(path, file, { contentType: file.type })
  if (uploadError) throw uploadError
  const { data: previous } = await supabase.from('room_backgrounds').select('storage_path').eq('user_id', userId).eq('room_key', room).maybeSingle()
  const { error } = await supabase.from('room_backgrounds').upsert({ user_id: userId, room_key: room, storage_path: path, position: 'center' }, { onConflict: 'user_id,room_key' })
  if (error) throw error
  if (previous?.storage_path) await supabase.storage.from('room-backgrounds').remove([previous.storage_path])
  const { data: signed } = await supabase.storage.from('room-backgrounds').createSignedUrl(path, 3600)
  return { room, storagePath: path, position: 'center', url: signed?.signedUrl ?? '' }
}

export async function removeRoomBackground(room: PageId) {
  const userId = await getUserId()
  if (!supabase || !userId) return false
  const { data } = await supabase.from('room_backgrounds').select('storage_path').eq('user_id', userId).eq('room_key', room).maybeSingle()
  const { error } = await supabase.from('room_backgrounds').delete().eq('user_id', userId).eq('room_key', room)
  if (error) throw error
  if (data?.storage_path) await supabase.storage.from('room-backgrounds').remove([data.storage_path])
  return true
}
