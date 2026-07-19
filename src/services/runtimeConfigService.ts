import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'
import { patchNotes } from '../lib/patchNotes'

export type AppPlatform = 'web' | 'ios' | 'android'
export type RuntimeAnnouncement = {
  id: string
  kind: 'notice' | 'maintenance' | 'event'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  actionLabel?: string
  actionUrl?: string
  startsAt: string
  endsAt?: string
  dismissible: boolean
  updatedAt: string
}
export type RuntimeCatalogItem = {
  productKey: string
  category: 'theme' | 'widget'
  title: string
  description: string
  priceKrw: number
  entitlementKey: string
  imageUrl?: string
  platforms: AppPlatform[]
  metadata: Record<string, unknown>
}
export type RuntimeRelease = {
  version: string
  title: string
  items: string[]
  releaseDate: string
  publishedAt: string
  minimumVersions: Partial<Record<AppPlatform, string>>
  forceUpdate: boolean
}
export type AiPointPolicy = {
  tiers: Record<'free' | 'royal' | 'royal_ai', { monthlyPoints: number; dailyRequests: number; signupBonus: number }>
  requestCosts: {
    chat: Record<'concise' | 'warm' | 'detailed', number>
    interpretRequest: number
    attachment: { businessCard: number; audioBase: number; audioPerMiB: number; documentBase: number; documentPerMiB: number; maximum: number }
  }
}
export type PlanCatalog = {
  trialDays: number
  plans: Record<'free' | 'royal' | 'royal_ai', { name: string; monthlyPriceKrw: number; annualPriceKrw: number; features: string[] }>
}
export type RuntimeConfig = {
  apiVersion: string
  minimumVersions: Partial<Record<AppPlatform, string>>
  forceUpdate: boolean
  maintenance: { enabled: boolean; blocking: boolean; title: string; message: string; startsAt?: string; endsAt?: string }
  featureFlags: Record<string, boolean>
  aiPointPolicy: AiPointPolicy
  planCatalog: PlanCatalog
  storeUrls: Partial<Record<'ios' | 'android', string>>
  updatedAt?: string
}
export type AppBootstrap = { config: RuntimeConfig; announcements: RuntimeAnnouncement[]; catalog: RuntimeCatalogItem[]; releases: RuntimeRelease[]; serverTime?: string; source: 'server' | 'cache' | 'fallback' }

const CACHE_KEY = 'rumen-app-bootstrap-v1'
export const currentPlatform = (): AppPlatform => {
  const value = Capacitor.getPlatform()
  return value === 'ios' || value === 'android' ? value : 'web'
}
export const currentAppVersion = () => currentPlatform() === 'web' ? '0.1.0' : '1.0.0'

export const fallbackRuntimeConfig: RuntimeConfig = {
  apiVersion: '2026-07-19',
  minimumVersions: { web: '0.1.0', ios: '1.0.0', android: '1.0.0' },
  forceUpdate: false,
  maintenance: { enabled: false, blocking: false, title: '왕국 통신망을 정비하고 있어요', message: '잠시 후 다시 찾아와 주세요.' },
  featureFlags: { ritaAi: true, fileAnalysis: true, premiumThemes: false, widgets: true, quickAiWidget: true },
  aiPointPolicy: {
    tiers: {
      free: { monthlyPoints: 4, dailyRequests: 8, signupBonus: 12 },
      royal: { monthlyPoints: 69, dailyRequests: 40, signupBonus: 12 },
      royal_ai: { monthlyPoints: 288, dailyRequests: 100, signupBonus: 12 },
    },
    requestCosts: {
      chat: { concise: 1, warm: 1, detailed: 4 }, interpretRequest: 1,
      attachment: { businessCard: 5, audioBase: 5, audioPerMiB: 4, documentBase: 5, documentPerMiB: 5, maximum: 30 },
    },
  },
  planCatalog: {
    trialDays: 14,
    plans: {
      free: { name: 'Free', monthlyPriceKrw: 0, annualPriceKrw: 0, features: ['일정·퀘스트·일기 기본 기능', '웹·iOS·Android 동기화', '기본 위젯'] },
      royal: { name: 'Royal', monthlyPriceKrw: 4900, annualPriceKrw: 39000, features: ['Free의 모든 기능', '리타 AI 월 69포인트', '리타 대화 위젯', '프리미엄 편의 기능'] },
      royal_ai: { name: 'Royal AI', monthlyPriceKrw: 9900, annualPriceKrw: 79000, features: ['Royal의 모든 기능', '리타 AI 월 288포인트', 'Sonnet 상세 분석', '파일·음성 분석 우선 이용'] },
    },
  },
  storeUrls: {},
}

function number(value: unknown, fallback: number, minimum = 0, maximum = 100000) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.round(parsed))) : fallback
}
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function stringArray(value: unknown) { return Array.isArray(value) ? value.map(String).slice(0, 40) : [] }

function normalizeConfig(value: unknown): RuntimeConfig {
  const row = object(value)
  const maintenance = object(row.maintenance)
  const featureFlags = object(row.feature_flags)
  const ai = object(row.ai_point_policy); const tiers = object(ai.tiers); const costs = object(ai.requestCosts); const chat = object(costs.chat); const attachment = object(costs.attachment)
  const plansRoot = object(row.plan_catalog); const plans = object(plansRoot.plans)
  const tier = (key: 'free' | 'royal' | 'royal_ai') => { const current = object(tiers[key]); const fallback = fallbackRuntimeConfig.aiPointPolicy.tiers[key]; return { monthlyPoints: number(current.monthlyPoints, fallback.monthlyPoints), dailyRequests: number(current.dailyRequests, fallback.dailyRequests, 1, 10000), signupBonus: number(current.signupBonus, fallback.signupBonus) } }
  const plan = (key: 'free' | 'royal' | 'royal_ai') => { const current = object(plans[key]); const fallback = fallbackRuntimeConfig.planCatalog.plans[key]; return { name: String(current.name ?? fallback.name).slice(0, 60), monthlyPriceKrw: number(current.monthlyPriceKrw, fallback.monthlyPriceKrw, 0, 1000000), annualPriceKrw: number(current.annualPriceKrw, fallback.annualPriceKrw, 0, 10000000), features: stringArray(current.features).length ? stringArray(current.features) : fallback.features } }
  return {
    apiVersion: String(row.api_version ?? fallbackRuntimeConfig.apiVersion).slice(0, 40),
    minimumVersions: object(row.minimum_versions) as RuntimeConfig['minimumVersions'],
    forceUpdate: row.force_update === true,
    maintenance: { enabled: maintenance.enabled === true, blocking: maintenance.blocking === true, title: String(maintenance.title ?? fallbackRuntimeConfig.maintenance.title).slice(0, 120), message: String(maintenance.message ?? fallbackRuntimeConfig.maintenance.message).slice(0, 1000), startsAt: maintenance.startsAt ? String(maintenance.startsAt) : undefined, endsAt: maintenance.endsAt ? String(maintenance.endsAt) : undefined },
    featureFlags: Object.fromEntries(Object.entries(featureFlags).map(([key, enabled]) => [key, enabled === true])),
    aiPointPolicy: { tiers: { free: tier('free'), royal: tier('royal'), royal_ai: tier('royal_ai') }, requestCosts: { chat: { concise: number(chat.concise, 1, 1, 30), warm: number(chat.warm, 1, 1, 30), detailed: number(chat.detailed, 4, 1, 30) }, interpretRequest: number(costs.interpretRequest, 1, 1, 30), attachment: { businessCard: number(attachment.businessCard, 5, 1, 30), audioBase: number(attachment.audioBase, 5, 1, 30), audioPerMiB: number(attachment.audioPerMiB, 4, 1, 30), documentBase: number(attachment.documentBase, 5, 1, 30), documentPerMiB: number(attachment.documentPerMiB, 5, 1, 30), maximum: number(attachment.maximum, 30, 1, 30) } } },
    planCatalog: { trialDays: number(plansRoot.trialDays, 14, 0, 90), plans: { free: plan('free'), royal: plan('royal'), royal_ai: plan('royal_ai') } },
    storeUrls: object(row.store_urls) as RuntimeConfig['storeUrls'],
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  }
}

function normalizeBootstrap(value: unknown, source: AppBootstrap['source']): AppBootstrap {
  const root = object(value)
  return {
    config: normalizeConfig(root.config),
    announcements: (Array.isArray(root.announcements) ? root.announcements : []).map((value) => { const row = object(value); return { id: String(row.id), kind: String(row.kind) as RuntimeAnnouncement['kind'], severity: String(row.severity) as RuntimeAnnouncement['severity'], title: String(row.title), message: String(row.message), actionLabel: row.action_label ? String(row.action_label) : undefined, actionUrl: row.action_url ? String(row.action_url) : undefined, startsAt: String(row.starts_at), endsAt: row.ends_at ? String(row.ends_at) : undefined, dismissible: row.dismissible !== false, updatedAt: String(row.updated_at) } }).slice(0, 20),
    catalog: (Array.isArray(root.catalog) ? root.catalog : []).map((value) => { const row = object(value); return { productKey: String(row.product_key), category: String(row.category) as RuntimeCatalogItem['category'], title: String(row.title), description: String(row.description ?? ''), priceKrw: number(row.price_krw, 0), entitlementKey: String(row.entitlement_key), imageUrl: row.image_url ? String(row.image_url) : undefined, platforms: (Array.isArray(row.platforms) ? row.platforms : []).map(String) as AppPlatform[], metadata: object(row.metadata) } }),
    releases: (Array.isArray(root.releases) ? root.releases : []).map((value) => { const row = object(value); return { version: String(row.version), title: String(row.title), items: stringArray(row.items), releaseDate: String(row.release_date), publishedAt: String(row.published_at), minimumVersions: object(row.minimum_versions) as RuntimeRelease['minimumVersions'], forceUpdate: row.force_update === true } }),
    serverTime: root.serverTime ? String(root.serverTime) : undefined,
    source,
  }
}

function fallbackBootstrap(): AppBootstrap {
  return { config: fallbackRuntimeConfig, announcements: [], catalog: [], releases: patchNotes.map((note) => ({ version: note.version, title: note.title, items: note.items, releaseDate: note.date, publishedAt: `${note.date}T00:00:00+09:00`, minimumVersions: {}, forceUpdate: false })), source: 'fallback' }
}

export async function loadAppBootstrap(): Promise<AppBootstrap> {
  if (supabase && navigator.onLine) {
    const { data, error } = await supabase.rpc('get_public_app_bootstrap', { p_platform: currentPlatform() })
    if (!error && data) {
      const normalized = normalizeBootstrap(data, 'server')
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* cache unavailable */ }
      return normalized
    }
  }
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) return normalizeBootstrap(JSON.parse(cached), 'cache')
  } catch { /* invalid cache */ }
  return fallbackBootstrap()
}

export function estimateAiPoints(policy: AiPointPolicy, input: { style?: 'concise' | 'warm' | 'detailed'; attachment?: { kind: 'business-card' | 'audio' | 'document'; size: number } }) {
  if (!input.attachment) return policy.requestCosts.chat[input.style ?? 'concise']
  const chunks = Math.ceil(Math.max(0, input.attachment.size) / 1024 / 1024)
  const costs = policy.requestCosts.attachment
  if (input.attachment.kind === 'business-card') return costs.businessCard
  return Math.min(costs.maximum, input.attachment.kind === 'audio' ? costs.audioBase + chunks * costs.audioPerMiB : costs.documentBase + chunks * costs.documentPerMiB)
}

export function compareVersions(left: string, right: string) {
  const parts = (value: string) => value.split(/[.+-]/).slice(0, 3).map((part) => Number(part) || 0)
  const a = parts(left); const b = parts(right)
  for (let index = 0; index < 3; index += 1) { if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1 }
  return 0
}
