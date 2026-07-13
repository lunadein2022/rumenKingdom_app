import { Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { pageCopy } from '../app/navigation'
import type { PageId } from '../types'

export function PageHeading({ page, title, description, eyebrow, children }: { page: PageId; title?: string; description?: string; eyebrow?: string; children?: ReactNode }) {
  const navigate = useNavigate()
  const copy = pageCopy[page]
  return <section className="page-heading" tabIndex={-1}>
    <div className="page-heading-copy"><span className="eyebrow">{eyebrow ?? copy.eyebrow}</span><h1>{title ?? copy.title}</h1><div className="royal-divider" aria-hidden="true"><i/><span>✦</span><i/></div><p>{description ?? copy.description}</p></div>
    <div className="page-heading-actions">{children}{page !== 'rita' && <button className="rita-button" onClick={() => navigate('/rita')}><Sparkles size={16}/> 리타에게 부탁하기</button>}</div>
  </section>
}
