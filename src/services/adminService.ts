import { supabase } from '../lib/supabase'
import type { AiPointPolicy, PlanCatalog } from './runtimeConfigService'

export type AdminContext = { isAdmin: boolean; role?: 'owner' | 'admin' | 'support' }
export type AdminUser = {
  userId: string
  email: string
  createdAt: string
  tier: 'free' | 'royal' | 'royal_ai'
  bonusPoints: number
  entitlements: { key: string; expiresAt?: string; createdAt: string }[]
}
export type BenefitType = 'ai_points' | 'cosmetic' | 'all_access'
export type AdminGrant = {
  id?: string
  grantId?: string
  recipientEmail: string
  benefitType: BenefitType
  benefitKey: string
  amount: number
  expiresAt?: string
  reason?: string
  createdAt?: string
  revokedAt?: string
  duplicate?: boolean
}

async function request<T>(body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } }
  const token = data.session?.access_token
  if (!token) throw new Error('관리자 화면은 로그인 후 사용할 수 있습니다.')
  const response = await fetch('/.netlify/functions/admin-benefits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({ error: '관리자 서버 응답을 읽지 못했습니다.' })) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? '관리자 요청을 처리하지 못했습니다.')
  return payload
}

async function runtimeRequest<T>(body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } }
  const token = data.session?.access_token
  if (!token) throw new Error('관리자 화면은 로그인 후 사용할 수 있습니다.')
  const response = await fetch('/.netlify/functions/admin-runtime', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  const payload = await response.json().catch(() => ({ error: '운영 설정 서버 응답을 읽지 못했습니다.' })) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? '운영 설정을 처리하지 못했습니다.')
  return payload
}

export type AdminRuntimeRow = { environment: string; api_version: string; minimum_versions: { web: string; ios: string; android: string }; force_update: boolean; maintenance: { enabled: boolean; blocking: boolean; title: string; message: string; startsAt?: string | null; endsAt?: string | null }; feature_flags: Record<string, boolean>; ai_point_policy: AiPointPolicy; plan_catalog: PlanCatalog; store_urls: { ios?: string | null; android?: string | null }; updated_at?: string }
export type AdminAnnouncement = { id?: string; kind: 'notice' | 'maintenance' | 'event'; severity: 'info' | 'warning' | 'critical'; title: string; message: string; action_label?: string | null; action_url?: string | null; platforms: string[]; starts_at: string; ends_at?: string | null; is_published: boolean; dismissible: boolean }
export type AdminCatalogItem = { product_key: string; category: 'theme' | 'widget'; title: string; description: string; price_krw: number; entitlement_key: string; image_url?: string | null; platforms: string[]; active: boolean; sort_order: number; metadata?: Record<string, unknown> }
export type AdminRelease = { version: string; title: string; items: string[]; platforms: string[]; release_date: string; published_at: string; is_published: boolean; minimum_versions: { web: string; ios: string; android: string }; force_update: boolean }
export type AdminRuntimeData = { role: string; runtime: AdminRuntimeRow; announcements: AdminAnnouncement[]; catalog: AdminCatalogItem[]; releases: AdminRelease[] }
export const getAdminRuntime = () => runtimeRequest<AdminRuntimeData>({ action: 'get' })
export const updateAdminRuntime = (runtime: AdminRuntimeRow) => runtimeRequest<{ runtime: AdminRuntimeRow }>({ action: 'update-runtime', runtime })
export const saveAdminAnnouncement = (announcement: AdminAnnouncement) => runtimeRequest<{ announcement: AdminAnnouncement }>({ action: 'save-announcement', announcement })
export const saveAdminCatalogItem = (item: AdminCatalogItem) => runtimeRequest<{ item: AdminCatalogItem }>({ action: 'save-catalog', item })
export const saveAdminRelease = (release: AdminRelease) => runtimeRequest<{ release: AdminRelease }>({ action: 'save-release', release })

export const getAdminContext = () => request<AdminContext>({ action: 'context' })
export const findAdminUser = async (email: string) => (await request<{ user: AdminUser }>({ action: 'find-user', email })).user
export const listAdminGrants = async () => (await request<{ grants: AdminGrant[] }>({ action: 'list-grants', limit: 100 })).grants

export async function grantAdminBenefit(input: {
  email: string
  benefitType: BenefitType
  benefitKey?: string
  amount?: number
  expiresAt?: string
  reason?: string
}): Promise<AdminGrant> {
  const payload = await request<{ grant: AdminGrant }>({
    action: 'grant',
    ...input,
    idempotencyKey: crypto.randomUUID(),
  })
  return payload.grant
}
