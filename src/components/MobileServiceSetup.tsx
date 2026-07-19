import { useEffect, useState } from 'react'
import { Cloud, ExternalLink } from 'lucide-react'

const SERVICE_URL_KEY = 'rumen-mobile-service-url'

function normalizedServiceUrl(value: string) {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:') return null
    url.pathname = '/'; url.search = ''; url.hash = ''
    return url.toString()
  } catch { return null }
}

export function MobileServiceSetup() {
  const [value, setValue] = useState(() => localStorage.getItem(SERVICE_URL_KEY) ?? '')
  const [message, setMessage] = useState('')
  useEffect(() => {
    const saved = normalizedServiceUrl(localStorage.getItem(SERVICE_URL_KEY) ?? '')
    if (saved) window.location.replace(saved)
  }, [])
  const connect = () => {
    const url = normalizedServiceUrl(value)
    if (!url) { setMessage('https://로 시작하는 Netlify 주소를 입력해 주세요.'); return }
    localStorage.setItem(SERVICE_URL_KEY, url)
    window.location.replace(url)
  }
  return <main className="mobile-service-setup">
    <img src="/assets/brand/main-logo.webp" alt="루멘왕국 공주의 하루"/>
    <Cloud size={28}/><h1>왕국 서버 연결</h1>
    <p>처음 한 번만 배포된 Netlify 주소를 입력하면 웹·iOS·Android가 같은 최신 화면과 Supabase 데이터를 사용합니다.</p>
    <label>Netlify 주소<input autoCapitalize="none" autoCorrect="off" inputMode="url" value={value} onChange={(event) => setValue(event.target.value)} placeholder="https://example.netlify.app"/></label>
    {message && <small role="alert">{message}</small>}
    <button onClick={connect}><ExternalLink size={16}/>왕국에 연결하기</button>
  </main>
}
