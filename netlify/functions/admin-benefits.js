import { createClient } from '@supabase/supabase-js'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
})

export const config = {
  path: '/.netlify/functions/admin-benefits',
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip'] },
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
  const contentType = String(event.headers['content-type'] ?? event.headers['Content-Type'] ?? '').toLowerCase()
  if (!contentType.includes('application/json')) return json(415, { error: 'Content-Type은 application/json이어야 합니다.' })
  if (Buffer.byteLength(String(event.body ?? ''), 'utf8') > 16 * 1024) return json(413, { error: '관리자 요청이 너무 큽니다.' })

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return json(503, { error: '관리자 서버 환경변수가 준비되지 않았습니다.' })

  const authorization = event.headers.authorization ?? event.headers.Authorization
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
  if (!token) return json(401, { error: '로그인이 필요합니다.' })

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) return json(401, { error: '로그인 세션이 유효하지 않습니다.' })

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    let input
    try { input = JSON.parse(String(event.body ?? '{}')) } catch { throw requestError('올바른 JSON 요청이 필요합니다.') }
    const action = String(input.action ?? '')
    const adminUserId = authData.user.id

    if (action === 'context') {
      const { data, error } = await serviceClient.rpc('admin_get_context', { p_admin_user_id: adminUserId })
      if (error) throw error
      return json(200, data)
    }

    if (action === 'find-user') {
      const email = normalizedEmail(input.email)
      const { data, error } = await serviceClient.rpc('admin_find_user', { p_admin_user_id: adminUserId, p_email: email })
      if (error) throw error
      return json(200, { user: data })
    }

    if (action === 'list-grants') {
      const { data, error } = await serviceClient.rpc('admin_list_benefit_grants', {
        p_admin_user_id: adminUserId,
        p_limit: Math.min(Math.max(Number(input.limit) || 30, 1), 100),
      })
      if (error) throw error
      return json(200, { grants: data })
    }

    if (action === 'grant') {
      const email = normalizedEmail(input.email)
      const benefitType = String(input.benefitType ?? '')
      if (!['ai_points', 'cosmetic', 'all_access'].includes(benefitType)) throw requestError('지원하지 않는 혜택 유형입니다.')
      const amount = benefitType === 'ai_points' ? Number(input.amount) : 1
      if (!Number.isInteger(amount) || amount < 1 || amount > 10000) throw requestError('포인트는 1~10,000 사이여야 합니다.')
      const benefitKey = String(input.benefitKey ?? '').trim().slice(0, 120)
      if (benefitType === 'cosmetic' && !benefitKey) throw requestError('꾸미기 상품 키가 필요합니다.')
      const expiresAt = input.expiresAt ? new Date(String(input.expiresAt)) : null
      if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) throw requestError('만료일은 미래여야 합니다.')
      const idempotencyKey = String(input.idempotencyKey ?? '')
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
        throw requestError('올바른 지급 요청 ID가 필요합니다.')
      }

      const { data, error } = await serviceClient.rpc('admin_grant_benefit', {
        p_admin_user_id: adminUserId,
        p_recipient_email: email,
        p_benefit_type: benefitType,
        p_benefit_key: benefitKey,
        p_amount: amount,
        p_expires_at: expiresAt?.toISOString() ?? null,
        p_reason: String(input.reason ?? '').trim().slice(0, 500),
        p_idempotency_key: idempotencyKey,
      })
      if (error) throw error
      return json(200, { grant: data })
    }

    return json(400, { error: '지원하지 않는 관리자 작업입니다.' })
  } catch (error) {
    const message = String(error?.message ?? '')
    if (message.includes('ADMIN_FORBIDDEN')) return json(403, { error: '관리자 권한이 없습니다.' })
    if (message.includes('ADMIN_USER_NOT_FOUND')) return json(404, { error: '해당 이메일의 가입자를 찾지 못했습니다.' })
    if (message.includes('ADMIN_INVALID') || message.includes('ADMIN_BENEFIT_KEY_REQUIRED')) return json(400, { error: '지급 정보를 다시 확인해 주세요.' })
    const statusCode = Number(error?.statusCode) || 500
    console.error('Admin benefits error', message.slice(0, 160))
    return json(statusCode, { error: error instanceof Error ? error.message : '관리자 요청을 처리하지 못했습니다.' })
  }
}

function normalizedEmail(value) {
  const email = String(value ?? '').trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw requestError('올바른 이메일을 입력해 주세요.')
  return email
}

function requestError(message) {
  return Object.assign(new Error(message), { statusCode: 400 })
}
