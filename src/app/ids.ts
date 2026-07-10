// 영속되는 엔티티(퀘스트/일정/메인퀘스트/일기/기억/연락처)의 기본키는 Supabase에서
// uuid 이므로, 앱에서 새로 만들 때도 uuid를 씁니다. 낙관적 UI 상태의 id와 DB 행의
// id가 같아야(=같은 uuid) 동기화가 맞물립니다.
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // 아주 오래된 환경 대비 폴백(실사용 브라우저에서는 위 경로를 탑니다).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
