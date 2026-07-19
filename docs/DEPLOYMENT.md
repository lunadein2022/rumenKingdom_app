# RUMEN KINGDOM 배포

## Supabase

새 프로젝트는 다음 순서로 SQL을 적용한다.

1. `supabase/schema.sql`
2. `supabase/migrations/202607120001_canonical_data_model.sql`
3. `supabase/migrations/202607130002_quest_completion_logs.sql`
4. `supabase/migrations/202607130003_relationship_groups.sql`
5. `supabase/migrations/202607190004_atomic_relationship_save.sql`
6. `supabase/migrations/202607190005_atomic_record_saves.sql`
7. `supabase/migrations/202607190006_ai_usage_controls.sql`
8. `supabase/verify_canonical_schema.sql` 실행 후 모든 필수 항목 확인

브라우저 환경변수:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Netlify Functions 환경변수:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `CLAUDE_HAIKU_MODEL`: 기본 대화와 요청 해석에 사용
- `CLAUDE_SONNET_MODEL`: 상세 답변과 첨부 분석에 사용
- `CLAUDE_MODEL`: 선택 사항인 이전 설정 호환용 fallback
- `OPENAI_API_KEY`: 음성 전사를 사용할 때만 필요
- `TRANSCRIPTION_MODEL`: 선택, 기본값 `gpt-4o-mini-transcribe`

API 키에는 `VITE_` 접두사를 사용하지 않는다. Netlify에서 secret으로 표시하고 Functions scope를 포함한 뒤 새 배포를 실행한다.

AI 함수는 호출 전에 Supabase RPC에서 포인트를 예약한다. 따라서 `202607190006_ai_usage_controls.sql`을 먼저 적용하지 않으면 AI 요청이 안전하게 차단된다. 출시 기준 포인트는 가입 12점, Free 월 4점, Royal 월 69점, Royal AI 월 288점이며 실패한 요청은 예약 포인트를 반환한다.

> **Phase 0 배포 잠금:** 현재 AI 계측 코드는 보안 기준선 확인용이다. `007_ai_usage_security_hardening.sql`에서 포인트 변경 RPC를 서버 전용으로 전환하고 사용자·IP 속도 제한을 적용하기 전에는 운영 Netlify에 배포하지 않는다. 자세한 상태는 `docs/PHASE_0_BASELINE.md`를 따른다.

## 로컬 실행

Vite만 실행하면 Netlify Function을 호출할 수 없다. 리타까지 검증할 때는 다음을 사용한다.

```bash
netlify dev
```

## 배포 전 검증

```bash
pnpm lint
pnpm build
```

추가 확인:

- 이메일·Google 로그인과 production redirect URL
- 서로 다른 두 계정의 RLS 격리
- PC에서 완료한 반복 퀘스트가 모바일에서도 같은 날짜에 완료로 표시되는지
- 다음 서비스일에 원본 기록을 삭제하지 않고 미완료로 표시되는지
- Netlify Function이 JSON과 올바른 4xx/5xx 상태를 반환하는지
