import { createClient } from '@supabase/supabase-js'

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) })
const requestError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const cleanText = (value, maximum, required = false) => { const result = String(value ?? '').trim().slice(0, maximum); if (required && !result) throw requestError('필수 운영 설정을 입력해 주세요.'); return result }
const integer = (value, minimum, maximum, label) => { const result = Number(value); if (!Number.isInteger(result) || result < minimum || result > maximum) throw requestError(`${label} 값을 확인해 주세요.`); return result }
const version = (value) => { const result = cleanText(value, 40, true); if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(result)) throw requestError('앱 버전은 1.0.0 형식이어야 합니다.'); return result }
const httpsUrl = (value) => { const result = cleanText(value, 500); if (!result) return null; try { const url = new URL(result); if (url.protocol !== 'https:') throw new Error(); return url.toString() } catch { throw requestError('링크는 https:// 주소여야 합니다.') } }

export const config = { path: '/.netlify/functions/admin-runtime', rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip'] } }

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
  if (!String(event.headers['content-type'] ?? event.headers['Content-Type'] ?? '').toLowerCase().includes('application/json')) return json(415, { error: 'Content-Type은 application/json이어야 합니다.' })
  if (Buffer.byteLength(String(event.body ?? ''), 'utf8') > 64 * 1024) return json(413, { error: '운영 설정 요청이 너무 큽니다.' })
  const supabaseUrl = process.env.SUPABASE_URL; const anonKey = process.env.SUPABASE_ANON_KEY; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceKey) return json(503, { error: '관리자 서버 환경변수가 준비되지 않았습니다.' })
  const authorization = event.headers.authorization ?? event.headers.Authorization
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return json(401, { error: '로그인이 필요합니다.' })
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) return json(401, { error: '로그인 세션이 유효하지 않습니다.' })
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  try {
    const input = JSON.parse(String(event.body ?? '{}')); const action = String(input.action ?? '')
    const { data: context, error: contextError } = await admin.rpc('admin_get_context', { p_admin_user_id: authData.user.id })
    if (contextError) throw contextError
    if (!context?.isAdmin) throw requestError('관리자 권한이 없습니다.', 403)
    if (action === 'get') return json(200, await readRuntime(admin, context.role))
    if (!['owner', 'admin'].includes(context.role)) throw requestError('운영 설정 변경 권한이 없습니다.', 403)

    if (action === 'update-runtime') {
      const patch = validateRuntime(input.runtime)
      const { data: before, error: beforeError } = await admin.from('app_runtime_config').select('*').eq('environment', 'production').single()
      if (beforeError) throw beforeError
      const { data: after, error } = await admin.from('app_runtime_config').update({ ...patch, updated_by: authData.user.id, updated_at: new Date().toISOString() }).eq('environment', 'production').select('*').single()
      if (error) throw error
      await audit(admin, authData.user.id, 'update', 'runtime', 'production', before, after)
      return json(200, { runtime: after })
    }

    if (action === 'save-announcement') {
      const value = validateAnnouncement(input.announcement)
      const id = String(input.announcement?.id ?? '')
      const before = id ? (await admin.from('app_announcements').select('*').eq('id', id).maybeSingle()).data : null
      const query = id
        ? admin.from('app_announcements').update({ ...value, updated_at: new Date().toISOString() }).eq('id', id)
        : admin.from('app_announcements').insert({ ...value, created_by: authData.user.id })
      const { data: after, error } = await query.select('*').single(); if (error) throw error
      await audit(admin, authData.user.id, id ? 'update' : 'create', 'announcement', after.id, before, after)
      return json(200, { announcement: after })
    }

    if (action === 'save-catalog') {
      const value = validateCatalog(input.item)
      const { data: before } = await admin.from('app_catalog_items').select('*').eq('product_key', value.product_key).maybeSingle()
      const { data: after, error } = await admin.from('app_catalog_items').upsert(value, { onConflict: 'product_key' }).select('*').single(); if (error) throw error
      await audit(admin, authData.user.id, before ? 'update' : 'create', 'catalog', value.product_key, before, after)
      return json(200, { item: after })
    }
    if (action === 'save-release') {
      const value = validateRelease(input.release)
      const { data: before } = await admin.from('app_releases').select('*').eq('version', value.version).maybeSingle()
      const { data: after, error } = await admin.from('app_releases').upsert(value, { onConflict: 'version' }).select('*').single(); if (error) throw error
      await audit(admin, authData.user.id, before ? 'update' : 'create', 'release', value.version, before, after)
      return json(200, { release: after })
    }
    throw requestError('지원하지 않는 관리자 작업입니다.')
  } catch (error) {
    console.error('Admin runtime error', String(error?.message ?? error).slice(0, 200))
    return json(Number(error?.statusCode) || 500, { error: error instanceof Error ? error.message : '운영 설정을 처리하지 못했습니다.' })
  }
}

async function readRuntime(client, role) {
  const [{ data: runtime, error }, { data: announcements }, { data: catalog }, { data: releases }] = await Promise.all([
    client.from('app_runtime_config').select('*').eq('environment', 'production').single(),
    client.from('app_announcements').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('app_catalog_items').select('*').order('sort_order').limit(100),
    client.from('app_releases').select('*').order('published_at', { ascending: false }).limit(100),
  ])
  if (error) throw error
  return { role, runtime, announcements: announcements ?? [], catalog: catalog ?? [], releases: releases ?? [] }
}

function validateRuntime(value) {
  const row = object(value); const maintenance = object(row.maintenance); const flags = object(row.feature_flags); const ai = object(row.ai_point_policy); const tiers = object(ai.tiers); const costs = object(ai.requestCosts); const attachment = object(costs.attachment); const chat = object(costs.chat); const catalog = object(row.plan_catalog); const plans = object(catalog.plans)
  const tier = (key) => { const item = object(tiers[key]); return { monthlyPoints: integer(item.monthlyPoints, 0, 100000, `${key} 월 포인트`), dailyRequests: integer(item.dailyRequests, 1, 10000, `${key} 일 요청`), signupBonus: integer(item.signupBonus, 0, 100000, `${key} 가입 포인트`) } }
  const plan = (key) => { const item = object(plans[key]); return { name: cleanText(item.name, 60, true), monthlyPriceKrw: integer(item.monthlyPriceKrw, 0, 1000000, `${key} 월 가격`), annualPriceKrw: integer(item.annualPriceKrw, 0, 10000000, `${key} 연 가격`), features: Array.isArray(item.features) ? item.features.map((entry) => cleanText(entry, 120, true)).slice(0, 20) : [] } }
  return {
    api_version: cleanText(row.api_version, 40, true),
    minimum_versions: { web: version(object(row.minimum_versions).web), ios: version(object(row.minimum_versions).ios), android: version(object(row.minimum_versions).android) },
    force_update: row.force_update === true,
    maintenance: { enabled: maintenance.enabled === true, blocking: maintenance.blocking === true, title: cleanText(maintenance.title, 120, true), message: cleanText(maintenance.message, 1000, true), startsAt: maintenance.startsAt || null, endsAt: maintenance.endsAt || null },
    feature_flags: Object.fromEntries(Object.entries(flags).slice(0, 100).map(([key, enabled]) => [cleanText(key, 80, true), enabled === true])),
    ai_point_policy: { tiers: { free: tier('free'), royal: tier('royal'), royal_ai: tier('royal_ai') }, requestCosts: { chat: { concise: integer(chat.concise,1,30,'간결 대화 포인트'), warm: integer(chat.warm,1,30,'다정 대화 포인트'), detailed: integer(chat.detailed,1,30,'상세 대화 포인트') }, interpretRequest: integer(costs.interpretRequest,1,30,'요청 해석 포인트'), attachment: { businessCard: integer(attachment.businessCard,1,30,'명함 포인트'), audioBase: integer(attachment.audioBase,1,30,'음성 기본 포인트'), audioPerMiB: integer(attachment.audioPerMiB,1,30,'음성 용량 포인트'), documentBase: integer(attachment.documentBase,1,30,'문서 기본 포인트'), documentPerMiB: integer(attachment.documentPerMiB,1,30,'문서 용량 포인트'), maximum: integer(attachment.maximum,1,30,'최대 포인트') } } },
    plan_catalog: { trialDays: integer(catalog.trialDays,0,90,'체험 일수'), plans: { free: plan('free'), royal: plan('royal'), royal_ai: plan('royal_ai') } },
    store_urls: { ios: httpsUrl(object(row.store_urls).ios), android: httpsUrl(object(row.store_urls).android) },
  }
}

function validateAnnouncement(value) { const row = object(value); const startsAt = new Date(String(row.starts_at ?? new Date().toISOString())); const endsAt = row.ends_at ? new Date(String(row.ends_at)) : null; if (!Number.isFinite(startsAt.getTime()) || (endsAt && (!Number.isFinite(endsAt.getTime()) || endsAt <= startsAt))) throw requestError('공지 기간을 확인해 주세요.'); return { kind: ['notice','maintenance','event'].includes(row.kind) ? row.kind : 'notice', severity: ['info','warning','critical'].includes(row.severity) ? row.severity : 'info', title: cleanText(row.title,120,true), message: cleanText(row.message,1000,true), action_label: cleanText(row.action_label,80), action_url: httpsUrl(row.action_url), platforms: Array.isArray(row.platforms) ? row.platforms.filter((item) => ['web','ios','android'].includes(item)) : ['web','ios','android'], starts_at: startsAt.toISOString(), ends_at: endsAt?.toISOString() ?? null, is_published: row.is_published === true, dismissible: row.dismissible !== false } }
function validateCatalog(value) { const row = object(value); const key = cleanText(row.product_key,120,true); if (!/^[a-z0-9._-]+$/.test(key)) throw requestError('상품 키는 영문 소문자, 숫자, 점, 밑줄만 사용할 수 있습니다.'); return { product_key:key, category: row.category === 'widget' ? 'widget' : 'theme', title:cleanText(row.title,120,true), description:cleanText(row.description,1000), price_krw:integer(row.price_krw,0,1000000,'상품 가격'), entitlement_key:cleanText(row.entitlement_key,120,true), image_url:httpsUrl(row.image_url), platforms:Array.isArray(row.platforms)?row.platforms.filter((item)=>['web','ios','android'].includes(item)):['ios','android'], active:row.active===true, sort_order:integer(row.sort_order ?? 0,-10000,10000,'정렬 순서'), metadata:object(row.metadata), updated_at:new Date().toISOString() } }
function validateRelease(value) { const row = object(value); const publishedAt = new Date(String(row.published_at ?? new Date().toISOString())); if (!Number.isFinite(publishedAt.getTime())) throw requestError('패치노트 게시 시각을 확인해 주세요.'); const items = Array.isArray(row.items) ? row.items.map((item)=>cleanText(item,500,true)).slice(0,30) : []; if (!items.length) throw requestError('패치노트 항목을 하나 이상 입력해 주세요.'); return { version:version(row.version), title:cleanText(row.title,120,true), items, platforms:Array.isArray(row.platforms)?row.platforms.filter((item)=>['web','ios','android'].includes(item)):['web','ios','android'], release_date:cleanText(row.release_date,10,true), published_at:publishedAt.toISOString(), is_published:row.is_published===true, minimum_versions:{web:version(object(row.minimum_versions).web),ios:version(object(row.minimum_versions).ios),android:version(object(row.minimum_versions).android)}, force_update:row.force_update===true, updated_at:new Date().toISOString() } }
async function audit(client, adminUserId, action, targetType, targetKey, before, after) { const { error } = await client.from('app_config_audit_log').insert({ admin_user_id:adminUserId, action, target_type:targetType, target_key:String(targetKey), before_value:before, after_value:after }); if (error) throw error }
