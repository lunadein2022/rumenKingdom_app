import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./client";

// Supabase 이메일/비밀번호 인증. supabase 클라이언트가 설정되지 않은 로컬
// (env 없음) 환경에서는 인증을 건너뛰고 mock 모드로 동작합니다.

export function isSupabaseEnabled(): boolean {
  return supabase !== null;
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// 세션 변화를 구독합니다(로그인/로그아웃/토큰 갱신). 해제 함수를 돌려줍니다.
export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
