import { supabase } from '../lib/supabase'

export async function deleteMyAccount() {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('다시 로그인한 뒤 탈퇴해 주세요.')
  const response = await fetch('/.netlify/functions/delete-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
  })
  const result = await response.json().catch(() => ({})) as { deleted?: boolean; error?: string }
  if (!response.ok || !result.deleted) throw new Error(result.error || '계정을 삭제하지 못했습니다.')
}

