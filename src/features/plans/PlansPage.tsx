import { useState } from 'react'
import { Check, Crown, Gift, Sparkles } from 'lucide-react'
import { useRuntimeConfig } from '../runtime/RuntimeConfig'
import { Pagination, usePaginatedList } from '../../components/Pagination'

const planKeys = ['free', 'royal', 'royal_ai'] as const

export function PlansPage() {
  const { config, catalog } = useRuntimeConfig()
  const [annual, setAnnual] = useState(true)
  const { trialDays, plans } = config.planCatalog
  const catalogPage = usePaginatedList(catalog, 'store-catalog')
  return <section className="plans-page">
    <header className="plans-hero panel glass-panel"><div><span className="eyebrow">ROYAL MEMBERSHIP</span><h2>공주님의 왕국에 맞는 이용 방식</h2><p>일정과 기록, 모든 기기 동기화는 계속 무료예요. 리타를 더 자주 이용하고 싶을 때만 업그레이드하세요.</p></div><span><Gift size={18}/><b>{trialDays}일 무료 체험</b><small>체험 종료 전 언제든 해지</small></span></header>
    <div className="billing-toggle" role="group" aria-label="결제 주기"><button className={!annual ? 'active' : ''} onClick={() => setAnnual(false)}>월간</button><button className={annual ? 'active' : ''} onClick={() => setAnnual(true)}>연간 · 할인</button></div>
    <div className="plan-grid">{planKeys.map((key) => { const plan = plans[key]; const featured = key === 'royal'; const price = annual ? plan.annualPriceKrw : plan.monthlyPriceKrw; return <article key={key} className={`panel glass-panel plan-card ${featured ? 'featured' : ''}`}>{featured && <span className="plan-recommend">추천</span>}<div className="plan-icon">{key === 'royal_ai' ? <Sparkles/> : <Crown/>}</div><h3>{plan.name}</h3><p className="plan-price"><b>{price ? `${price.toLocaleString()}원` : '무료'}</b>{price > 0 && <small>/{annual ? '년' : '월'}</small>}</p>{annual && plan.monthlyPriceKrw > 0 && <small className="plan-equivalent">월 약 {Math.round(plan.annualPriceKrw / 12).toLocaleString()}원</small>}<ul>{plan.features.map((feature) => <li key={feature}><Check size={14}/>{feature}</li>)}</ul><button className={featured ? 'primary' : 'ghost'} disabled>{key === 'free' ? '현재 기본 제공' : `${trialDays}일 체험 준비 중`}</button></article> })}</div>
    <section className="plan-policy panel glass-panel"><h3>리타 AI 포인트 기준</h3><div>{planKeys.map((key) => <span key={key}><b>{plans[key].name}</b><strong>{config.aiPointPolicy.tiers[key].monthlyPoints}P</strong><small>월 제공 · 하루 최대 {config.aiPointPolicy.tiers[key].dailyRequests}회</small></span>)}</div><p>실패한 요청은 포인트가 반환되며, 보내기 전에 예상 차감 포인트를 확인할 수 있어요.</p></section>
    {catalog.length > 0 && <section className="catalog-section"><header><span className="eyebrow">PALACE COLLECTION</span><h2>테마·위젯 컬렉션</h2></header><div>{catalogPage.visibleItems.map((item) => <article className="panel glass-panel" key={item.productKey}><span>{item.category === 'theme' ? '궁전 테마' : '위젯'}</span><h3>{item.title}</h3><p>{item.description}</p><b>{item.priceKrw.toLocaleString()}원</b></article>)}</div><Pagination page={catalogPage.page} totalItems={catalogPage.totalItems} onPageChange={catalogPage.setPage} label="테마·위젯 상품"/></section>}
  </section>
}
