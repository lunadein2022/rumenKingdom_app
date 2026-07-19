import { supabase } from './supabase'
import { Capacitor } from '@capacitor/core'

export type SyncEntity = 'project' | 'quest' | 'calendar_event' | 'diary' | 'memo' | 'relationship' | 'relationship_group'
export type SyncOperation = 'create' | 'update' | 'delete'

type QueueItem = {
  userId: string
  deviceId: string
  mutationId: string
  entityType: SyncEntity
  operation: SyncOperation
  recordId: string
  expectedRevision?: number
  payload: Record<string, unknown>
  createdAt: string
}

type MutationResponse = {
  status: 'applied' | 'conflict' | 'not_found'
  revision?: number
  record?: Record<string, unknown>
  serverRecord?: Record<string, unknown>
}

const DEVICE_KEY = 'rumen-sync-device-id'
const QUEUE_KEY = 'rumen-sync-outbox-v1'
const REVISION_KEY = 'rumen-sync-revisions-v1'
const CURSOR_KEY = 'rumen-sync-cursors-v1'

export function pendingSyncCount() { return readJson<QueueItem[]>(QUEUE_KEY, []).length }

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? '') as T } catch { return fallback }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function deviceId() {
  let value = localStorage.getItem(DEVICE_KEY)
  if (!value) { value = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, value) }
  return value
}

function revisionKey(entityType: SyncEntity, recordId: string) { return `${entityType}:${recordId}` }

export function rememberSyncRevision(entityType: SyncEntity, recordId: string, revision?: number) {
  if (!revision || revision < 1) return
  const revisions = readJson<Record<string, number>>(REVISION_KEY, {})
  revisions[revisionKey(entityType, recordId)] = revision
  writeJson(REVISION_KEY, revisions)
}

export function currentSyncRevision(entityType: SyncEntity, recordId: string, fallback = 1) {
  return readJson<Record<string, number>>(REVISION_KEY, {})[revisionKey(entityType, recordId)] ?? fallback
}

async function currentUserId() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

function isRetryableNetworkError(error: unknown) {
  if (!navigator.onLine) return true
  const message = error instanceof Error ? error.message : String(error)
  return /failed to fetch|network|load failed|timeout|connection/i.test(message)
}

async function send(item: QueueItem): Promise<MutationResponse> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.')
  const { data, error } = await supabase.rpc('apply_sync_mutation', {
    p_device_id: item.deviceId,
    p_mutation_id: item.mutationId,
    p_platform: Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android'
      ? Capacitor.getPlatform()
      : 'web',
    p_app_version: '0.1.0',
    p_entity_type: item.entityType,
    p_operation: item.operation,
    p_record_id: item.recordId,
    p_expected_revision: item.expectedRevision ?? null,
    p_payload: item.payload,
  })
  if (error) throw error
  return data as MutationResponse
}

function announce(type: 'queued' | 'flushed' | 'conflict', detail: unknown) {
  window.dispatchEvent(new CustomEvent(`rumen-sync-${type}`, { detail: { value: detail, pending: pendingSyncCount() } }))
}

export async function applySyncMutation(input: {
  entityType: SyncEntity
  operation: SyncOperation
  recordId: string
  payload?: Record<string, unknown>
  expectedRevision?: number
}) {
  const userId = await currentUserId()
  if (!userId) return { status: 'local' as const }
  const item: QueueItem = {
    userId,
    deviceId: deviceId(),
    mutationId: crypto.randomUUID(),
    entityType: input.entityType,
    operation: input.operation,
    recordId: input.recordId,
    expectedRevision: input.operation === 'create'
      ? undefined
      : input.expectedRevision ?? currentSyncRevision(input.entityType, input.recordId),
    payload: input.payload ?? {},
    createdAt: new Date().toISOString(),
  }

  if (!navigator.onLine) {
    const queue = readJson<QueueItem[]>(QUEUE_KEY, [])
    queue.push(item); writeJson(QUEUE_KEY, queue); announce('queued', item)
    return { status: 'queued' as const }
  }

  try {
    const response = await send(item)
    if (response.status === 'conflict' || response.status === 'not_found') {
      announce('conflict', { item, response })
      throw new Error(response.status === 'conflict' ? '다른 기기에서 먼저 수정한 기록입니다. 최신 기록을 다시 불러왔습니다.' : '다른 기기에서 삭제된 기록입니다.')
    }
    rememberSyncRevision(item.entityType, item.recordId, response.revision)
    return response
  } catch (error) {
    if (!isRetryableNetworkError(error)) throw error
    const queue = readJson<QueueItem[]>(QUEUE_KEY, [])
    queue.push(item); writeJson(QUEUE_KEY, queue); announce('queued', item)
    return { status: 'queued' as const }
  }
}

export async function flushSyncQueue() {
  const userId = await currentUserId()
  if (!userId || !navigator.onLine) return
  const all = readJson<QueueItem[]>(QUEUE_KEY, [])
  const remaining: QueueItem[] = all.filter((item) => item.userId !== userId)
  const pending = all.filter((item) => item.userId === userId)

  for (let index = 0; index < pending.length; index += 1) {
    const item = pending[index]
    try {
      const response = await send(item)
      if (response.status !== 'applied') {
        remaining.push(item, ...pending.slice(index + 1))
        announce('conflict', { item, response })
        break
      }
      rememberSyncRevision(item.entityType, item.recordId, response.revision)
      if (response.revision) {
        for (const next of pending.slice(index + 1)) {
          if (next.entityType === item.entityType && next.recordId === item.recordId && next.operation !== 'create') {
            next.expectedRevision = response.revision
          }
        }
      }
      announce('flushed', item)
    } catch (error) {
      remaining.push(item, ...pending.slice(index + 1))
      if (!isRetryableNetworkError(error)) announce('conflict', { item, error })
      break
    }
  }
  writeJson(QUEUE_KEY, remaining)
  window.dispatchEvent(new CustomEvent('rumen-sync-queue-changed', { detail: { pending: remaining.length } }))
}

export function startSyncEngine(onRemoteChanges: () => void) {
  let stopped = false
  let timer = 0
  const cycle = async () => {
    if (stopped || !navigator.onLine || !supabase) return
    await flushSyncQueue()
    const userId = await currentUserId()
    if (!userId) return
    const cursors = readJson<Record<string, number>>(CURSOR_KEY, {})
    const { data, error } = await supabase.rpc('get_sync_changes', { p_after_id: cursors[userId] ?? 0, p_limit: 500 })
    if (error || stopped) return
    const result = data as { changes?: unknown[]; nextCursor?: number }
    if ((result.changes?.length ?? 0) > 0) onRemoteChanges()
    if (result.nextCursor !== undefined) { cursors[userId] = result.nextCursor; writeJson(CURSOR_KEY, cursors) }
  }
  const online = () => void cycle()
  window.addEventListener('online', online)
  void cycle()
  timer = window.setInterval(() => void cycle(), 30_000)
  return () => { stopped = true; window.removeEventListener('online', online); window.clearInterval(timer) }
}
