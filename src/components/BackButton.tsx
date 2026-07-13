import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function BackButton({ fallback, label = '뒤로가기' }: { fallback: string; label?: string }) {
  const navigate = useNavigate()
  const goBack = () => {
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (index > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
  return <button className="back-button" onClick={goBack}><ArrowLeft size={16}/>{label}</button>
}
