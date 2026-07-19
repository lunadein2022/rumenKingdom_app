# RUMEN KINGDOM 배포

## Supabase

새 프로젝트는 다음 순서로 SQL을 적용한다.

1. `supabase/schema.sql`
2. `supabase/migrations/202607120001_canonical_data_model.sql`
3. `supabase/migrations/202607130002_quest_completion_logs.sql`
4. `supabase/migrations/202607130003_relationship_groups.sql`
5. `supabase/migrations/202607190004_atomic_relationship_save.sql`
6. `supabase/migrations/202607190005_atomic_record_saves.sql`
7. `supabase/verify_canonical_schema.sql` 실행 후 모든 필수 항목 확인

브라우저 환경변수:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Netlify Functions 환경변수:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `CLAUDE_MODEL`
- `OPENAI_API_KEY`: 음성 전사를 사용할 때만 필요
- `TRANSCRIPTION_MODEL`: 선택, 기본값 `gpt-4o-mini-transcribe`

API 키에는 `VITE_` 접두사를 사용하지 않는다. Netlify에서 secret으로 표시하고 Functions scope를 포함한 뒤 새 배포를 실행한다.

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
