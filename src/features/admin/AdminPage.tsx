import { useEffect, useState } from 'react'
import { Gift, LoaderCircle, Search, ShieldCheck } from 'lucide-react'
import {
  findAdminUser,
  getAdminContext,
  grantAdminBenefit,
  listAdminGrants,
  type AdminGrant,
  type AdminUser,
  type BenefitType,
} from '../../services/adminService'
import { AdminRuntimePanel } from './AdminRuntimePanel'

const benefitLabels: Record<BenefitType, string> = {
  ai_points: '리타 AI 포인트',
  cosmetic: '꾸미기 상품',
  all_access: '전체 기능 이용권',
}

export function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [user, setUser] = useState<AdminUser | null>(null)
  const [benefitType, setBenefitType] = useState<BenefitType>('ai_points')
  const [amount, setAmount] = useState(10)
  const [benefitKey, setBenefitKey] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [reason, setReason] = useState('')
  const [grants, setGrants] = useState<AdminGrant[]>([])
  const [historyFilter, setHistoryFilter] = useState<'all' | BenefitType>('all')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const visibleGrants = historyFilter === 'all' ? grants : grants.filter((grant) => grant.benefitType === historyFilter)
  const pointGrantTotal = grants.filter((grant) => grant.benefitType === 'ai_points').reduce((sum, grant) => sum + grant.amount, 0)
  const entitlementGrantCount = grants.filter((grant) => grant.benefitType !== 'ai_points').length

  useEffect(() => {
    void getAdminContext().then((context) => {
      setAuthorized(context.isAdmin)
      setRole(context.role ?? '')
      if (context.isAdmin) void listAdminGrants().then(setGrants).catch((error) => setMessage(error instanceof Error ? error.message : '지급 이력을 불러오지 못했습니다.'))
    }).catch((error) => { setAuthorized(false); setMessage(error instanceof Error ? error.message : '관리자 권한을 확인하지 못했습니다.') })
  }, [])

  const search = async () => {
    setLoading(true); setMessage(''); setUser(null)
    try { setUser(await findAdminUser(email)) }
    catch (error) { setMessage(error instanceof Error ? error.message : '사용자를 찾지 못했습니다.') }
    finally { setLoading(false) }
  }

  const grant = async () => {
    if (!user) return
    setLoading(true); setMessage('')
    try {
      await grantAdminBenefit({
        email: user.email,
        benefitType,
        amount: benefitType === 'ai_points' ? amount : 1,
        benefitKey: benefitType === 'cosmetic' ? benefitKey.trim() : undefined,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59+09:00`).toISOString() : undefined,
        reason,
      })
      window.dispatchEvent(new Event('rumen-ai-usage-changed'))
      window.dispatchEvent(new Event('rumen-notifications-changed'))
      setMessage(`${user.email} 계정에 ${benefitLabels[benefitType]} 지급을 완료했습니다.`)
      setUser(await findAdminUser(user.email))
      setGrants(await listAdminGrants())
      setReason('')
    } catch (error) { setMessage(error instanceof Error ? error.message : '혜택을 지급하지 못했습니다.') }
    finally { setLoading(false) }
  }

  if (authorized === null) return <section className="panel glass-panel admin-access"><LoaderCircle className="spin"/><p>왕실 관리자 인장을 확인하고 있어요.</p></section>
  if (!authorized) return <section className="panel glass-panel admin-access"><ShieldCheck/><h2>관리자 전용 구역</h2><p>{message || '이 계정에는 관리자 권한이 없습니다.'}</p></section>

  return <section className="admin-page">
    <header className="panel glass-panel admin-hero"><div><span className="eyebrow">ROYAL ADMINISTRATION</span><h2>왕실 혜택 관리소</h2><p>포인트와 꾸미기 이용권을 안전하게 지급하고 이력을 확인합니다.</p></div><span><ShieldCheck size={17}/>{role}</span></header>
    <div className="admin-grid">
      <article className="panel glass-panel admin-card">
        <h3>가입자 찾기</h3>
        <div className="admin-search"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@example.com" onKeyDown={(event) => event.key === 'Enter' && void search()}/><button className="primary" onClick={() => void search()} disabled={loading || !email.trim()}><Search size={15}/>검색</button></div>
        {user && <div className="admin-user-summary"><b>{user.email}</b><span>등급 {user.tier}</span><span>보너스 포인트 {user.bonusPoints.toLocaleString()}</span><small>{user.entitlements.length ? user.entitlements.map((item) => item.key).join(', ') : '보유 이용권 없음'}</small></div>}
      </article>
      <article className="panel glass-panel admin-card">
        <h3>혜택 지급</h3>
        <label>혜택 종류<select value={benefitType} onChange={(event) => setBenefitType(event.target.value as BenefitType)}><option value="ai_points">리타 AI 포인트</option><option value="cosmetic">꾸미기 상품</option><option value="all_access">전체 기능 이용권</option></select></label>
        {benefitType === 'ai_points' && <label>포인트<input type="number" min="1" max="10000" value={amount} onChange={(event) => setAmount(Number(event.target.value))}/></label>}
        {benefitType === 'cosmetic' && <label>상품 키<input value={benefitKey} onChange={(event) => setBenefitKey(event.target.value)} placeholder="theme.rose_palace"/></label>}
        {benefitType !== 'ai_points' && <label>만료일 · 선택<input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)}/></label>}
        <label>지급 사유<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="이벤트명 또는 고객지원 사유"/></label>
        <button className="primary" onClick={() => void grant()} disabled={loading || !user || (benefitType === 'cosmetic' && !benefitKey.trim())}>{loading ? <LoaderCircle size={15} className="spin"/> : <Gift size={15}/>}선택 계정에 지급</button>
      </article>
    </div>
    {message && <p className="admin-message" role="status">{message}</p>}
    <article className="panel glass-panel admin-history">
      <div className="admin-history-head"><div><h3>관리자 지급 이력</h3><p>최근 {grants.length}건 · 포인트 총 {pointGrantTotal.toLocaleString()}P · 이용권 {entitlementGrantCount}건</p></div><div className="admin-history-filters"><button className={historyFilter === 'all' ? 'active' : ''} onClick={() => setHistoryFilter('all')}>전체</button><button className={historyFilter === 'ai_points' ? 'active' : ''} onClick={() => setHistoryFilter('ai_points')}>포인트</button><button className={historyFilter === 'cosmetic' ? 'active' : ''} onClick={() => setHistoryFilter('cosmetic')}>꾸미기</button><button className={historyFilter === 'all_access' ? 'active' : ''} onClick={() => setHistoryFilter('all_access')}>전체 이용권</button></div></div>
      {visibleGrants.length ? <div className="admin-history-list">{visibleGrants.map((grant) => <div key={grant.id ?? `${grant.recipientEmail}-${grant.createdAt}`}><span><b>{grant.recipientEmail}</b><small>{grant.benefitType === 'ai_points' ? '포인트 지급' : benefitLabels[grant.benefitType]} · {grant.benefitKey}</small></span><strong className={grant.benefitType}>{grant.benefitType === 'ai_points' ? `+${grant.amount.toLocaleString()}P` : '이용권'}</strong><time>{grant.createdAt ? new Date(grant.createdAt).toLocaleString('ko-KR') : ''}</time><em>{grant.reason || '사유 미기재'}</em></div>)}</div> : <p>선택한 유형의 지급 이력이 없습니다.</p>}
    </article>
    <AdminRuntimePanel/>
  </section>
}
