import { supabase } from '../lib/supabase'

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

export const getAdminContext = () => request<AdminContext>({ action: 'context' })
export const findAdminUser = async (email: string) => (await request<{ user: AdminUser }>({ action: 'find-user', email })).user
export const listAdminGrants = async () => (await request<{ grants: AdminGrant[] }>({ action: 'list-grants', limit: 30 })).grants

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
