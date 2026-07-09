// Princess OS는 현재 Supabase에 실제로 연결되어 있지 않습니다.
// services/supabase/*.ts 는 스키마에 맞춘 TODO 스캐폴딩일 뿐, 아직 아무 화면에서도 호출되지 않습니다.
// VITE_USE_MOCK 을 명시적으로 분기해서, "Supabase 연동 완료"처럼 보이는 착시를 없앱니다.
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK !== "false";
