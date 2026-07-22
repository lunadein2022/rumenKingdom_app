# 게임성 시스템 설계 — 레벨업 · 상점 · 인벤토리

## 목표

퀘스트 완료에 경험치(XP)를 붙여 레벨업 시스템을 만들고, 레벨업으로 얻는 재화로 공주의상·배경·장소·펫을 사고 장착하게 한다. 핵심 제약은 두 가지다.

1. **기존 유료 상점과 완전히 분리한다.** `app_catalog_items`(프리미엄 테마·위젯, 실결제)는 그대로 두고, 이번 시스템은 레벨업 재화로만 사는 무료 트랙으로 새로 만든다.
2. **악용 불가능해야 한다.** 클라이언트가 "나 XP 줘"라고 직접 요청할 수 있는 경로를 아예 없앤다 — XP는 퀘스트 완료라는 이미 검증된 쓰기 작업의 부산물로만 생긴다. 이 문서의 3장이 그 설계다.

기존 요금제 정책(광고 없음, 일정·퀘스트·일기 무료)에는 영향 없음 — 레벨업 시스템도 전 사용자 무료다.

## 기존 스키마와의 관계

실제 운영 스키마 기준(`supabase/migrations/202607120001_canonical_data_model.sql`, `projectRepository.ts` 주석 확인):

- **메인퀘스트** = `public.main_quests` 테이블 (Project). 완료 시 `status = 'completed'`.
- **일일퀘스트 / 서브퀘스트** = `public.quests` 테이블, `kind` 컬럼이 `'daily' | 'sub'`.
- 반복되는 일일퀘스트는 `public.quest_completion_logs`에 날짜별로 기록되고, `unique(user_id, quest_id, occurrence_date)` 제약이 이미 걸려 있다 — 이 제약을 XP 중복 지급 방지에 그대로 재사용할 수 있다.

## 1. 경험치(XP) — 기본안

| 소스 | 기본 XP | 비고 |
| --- | --- | --- |
| 서브퀘스트 완료 | 10 | 1회성, 퀘스트당 1회 |
| 일일퀘스트 완료(occurrence) | 20 | 반복이면 날짜당 1회 |
| 메인퀘스트 완료 | 150 | 1회성, 목표 달성 보상이라 크게 |

우선순위(`priority: high/medium/low`, 이미 존재하는 필드) 배수: high ×1.5, medium ×1.0, low ×0.7. 연속 완료 스트릭 보너스는 선택사항으로 남겨둔다 — 일일퀘를 며칠 연속 완료했는지는 `quest_completion_logs`로 이미 계산 가능하니, 원하면 나중에 추가해도 스키마 변경이 필요 없다.

레벨 곡선(제안): `다음 레벨까지 필요한 XP = round(80 × level^1.35)`. 초반은 금방 오르고 뒤로 갈수록 벌어지는 전형적인 커브다. 정확한 숫자는 밸런스 문제라 나중에 `app_runtime_config`처럼 관리자가 즉시 바꿀 수 있는 설정값으로 빼는 걸 추천한다(재배포 없이 튜닝).

## 2. 레벨업 재화

레벨업 시점에만 재화를 지급한다(XP 자체는 재화가 아님) — 그래야 "XP를 쌓아뒀다가 한 번에 상점을 턴다" 같은 걱정 없이, 재화 지급 이벤트 자체가 레벨업이라는 드문 이벤트로 한정된다. 레벨업당 기본 지급량은 50, 5의 배수 레벨(5·10·15…)마다 보너스 100 추가.

재화 이름은 세계관에 맞게 나중에 정하면 된다 — "왕관 조각", "별빛 결정", "장미 인장" 같은 후보를 적어뒀다.

## 3. 악용 방지 (핵심)

클라이언트가 직접 호출해서 XP를 받는 RPC를 만들지 않는다. 대신 **DB 트리거**로 처리한다.

- `public.quests`의 `status`가 `completed`로 바뀌는 순간(AFTER UPDATE 트리거)에만 XP 지급 로직이 돈다. 클라이언트는 여전히 기존 `apply_sync_mutation` 경로로 퀘스트를 수정할 뿐, XP를 직접 건드릴 방법이 없다.
- **중복 지급 차단**: `xp_ledger`에 `unique(user_id, source_type, source_id, occurrence_date)` 제약을 걸어서, 완료→취소→재완료를 반복해도 같은 퀘스트/같은 날짜에는 딱 한 번만 XP가 쌓인다. 반복 일일퀘스트는 `quest_completion_logs`의 기존 unique 제약을 그대로 얹어 쓴다.
- **즉석 생성-완료 스팸 차단**: 퀘스트가 생성된 지 최소 30초는 지나야 XP를 준다(`completed_at - created_at >= interval '30 seconds'`). 봇으로 수백 개를 만들고 바로 완료 처리하는 걸 막는다.
- **일일 상한**: 하루에 서브퀘스트 XP 지급 횟수 상한(예: 15회)을 둬서, 30초 가드를 우회해 미리 만들어둔 퀘스트를 한 번에 몰아서 완료해도 그 이상은 지급하지 않는다.
- **삭제/재생성 악용**: 퀘스트를 지웠다 새로 만들면 새 퀘스트로 취급돼 다시 XP를 받을 순 있지만, 위 일일 상한과 30초 가드가 그 반복 자체를 이미 느리고 비효율적으로 만든다.

## 4. DB 스키마 (신규 테이블, 초안)

```sql
create table if not exists public.player_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  level integer not null default 1 check (level >= 1),
  total_xp integer not null default 0 check (total_xp >= 0),
  currency_balance integer not null default 0 check (currency_balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('main_quest', 'daily_quest', 'sub_quest')),
  source_id uuid not null,
  occurrence_date date,
  xp_amount integer not null check (xp_amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id, occurrence_date)
);

create table if not exists public.level_currency_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  level integer not null check (level >= 1),
  currency_amount integer not null check (currency_amount > 0),
  granted_at timestamptz not null default now(),
  primary key (user_id, level)
);

create table if not exists public.shop_items (
  item_key text primary key,
  category text not null check (category in ('costume', 'background', 'location', 'pet')),
  title text not null,
  description text not null default '',
  price_currency integer not null check (price_currency >= 0),
  min_level integer not null default 1 check (min_level >= 1),
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null references public.shop_items(item_key),
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

create table if not exists public.user_equipped_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null check (slot in ('costume', 'background', 'location', 'pet')),
  item_key text references public.shop_items(item_key),
  equipped_at timestamptz not null default now(),
  primary key (user_id, slot)
);
```

RLS는 기존 패턴 그대로: 본인 행만 `select` 가능(`auth.uid() = user_id`), `insert/update/delete`는 열지 않는다 — 전부 아래 SECURITY DEFINER 함수·트리거를 거쳐서만 바뀐다. `shop_items`는 `active`인 것만 전체 인증 사용자에게 `select` 허용, 쓰기는 `service_role`만.

## 5. 서버 함수 / 트리거

- `public._apply_xp(p_user_id, p_xp_amount)` — 내부 헬퍼. `player_progress` 행을 `for update`로 잠그고 `total_xp`를 올린 뒤 레벨 재계산, 레벨이 오르면 `level_currency_grants`에 삽입(PK가 `(user_id, level)`이라 레벨당 정확히 1회만 지급됨)하고 `currency_balance`를 더한다.
- `public.quests`, `public.main_quests`, `public.quest_completion_logs`에 AFTER INSERT/UPDATE 트리거를 달아 완료 전이(`status`가 `completed`로 바뀌는 순간, 또는 완료 로그 신규 삽입)를 감지하면 `xp_ledger`에 넣고 `_apply_xp`를 호출한다. 3장의 가드(30초, 일일 상한, unique 제약)는 이 트리거 함수 안에서 체크한다.
- `public.purchase_shop_item(p_item_key text)` — SECURITY DEFINER, `pg_advisory_xact_lock`으로 동시 구매 방지. 레벨 충족·재화 충분·미보유 확인 후 `currency_balance` 차감 + `user_inventory` 삽입을 한 트랜잭션으로.
- `public.equip_item(p_slot text, p_item_key text)` — 보유 여부 확인 후 `user_equipped_items` upsert.
- `public.get_my_game_progress()` — 클라이언트가 읽기 전용으로 레벨·XP·다음 레벨까지 필요량·재화·장착 아이템을 한 번에 받는 함수. `get_my_ai_usage()`와 같은 역할.

이 다섯 개 중 클라이언트가 직접 호출하는 건 `purchase_shop_item`, `equip_item`, `get_my_game_progress` 셋뿐이고, 셋 다 "얼마나 줄지"를 클라이언트가 정하지 못하는 구조다.

## 6. 화면 구성 (제안)

- **레벨 배지 + XP 바**: `AppHeader` 또는 `ThronePage` 상단, 기존 크라운 아이콘 옆에 "Lv.7"과 진행 바.
- **완료 시 피드백**: `QuestRow`에서 체크할 때 "+10 XP" 짧은 토스트.
- **레벨업 연출**: 이미 만들어둔 `AnnouncementModal`과 같은 `BodyAreaOverlay` 패턴으로 풀스크린 축하 모달 — 리타 대사로 "레벨업! 왕관 조각을 얻었어요" 같은 톤 활용 가능.
- **상점 화면**: 새 라우트(예: `/throne/shop`, 이름은 "보물창고" 등 세계관에 맞게). 의상/배경/장소/펫 탭, 카드에 가격·필요 레벨·보유 여부 표시.
- **인벤토리 + 장착**: `ThronePage`에 "치장" 섹션 추가. 지금 `princessOptions` 선택 UI(`readSelectedPrincessId`/`storeSelectedPrincessId`)와 같은 패턴으로 슬롯별(의상/배경/장소/펫) 장착 선택.

열린 질문: "배경"과 "장소"가 화면에서 정확히 뭘 바꾸는지(공주 초상화 뒤 배경 vs 로비/집무실 페이지 테마인지), 펫이 상시 노출되는 위치가 어디인지는 아직 정해지지 않았다 — 상점 아이템 목록을 실제로 짤 때 같이 정하면 된다.

## 7. 다음 단계

1. 마이그레이션 파일 작성 (`supabase/migrations/2026072X_game_leveling_system.sql`) — 4장 스키마 + RLS + 5장 함수/트리거.
2. `get_public_app_bootstrap`처럼 `verify_*.sql` 검증 스크립트 하나 추가 — 특히 "같은 퀘스트 완료를 반복해도 XP가 한 번만 쌓이는지"를 실제로 실행해서 확인하는 항목.
3. 프론트엔드: `gameProgressRepository`(가칭) + `ShopPage` + 장착 UI.
4. 초기 상점 아이템 목록(의상/배경/장소/펫 각 몇 개, 가격, 필요 레벨) 확정 — 이건 순수 콘텐츠 작업이라 별도로 정리하는 게 좋다.

## 8. 테스트 체크리스트

- 같은 퀘스트를 완료→취소→재완료해도 XP가 중복 지급되지 않는다.
- 생성 30초 이내에 완료 처리하면 XP가 지급되지 않는다.
- 하루 서브퀘스트 XP 지급 횟수가 상한을 넘으면 초과분은 지급되지 않는다.
- 레벨업 재화는 레벨당 정확히 1회만 지급된다(레벨을 왔다갔다 해도 재지급 없음).
- 상점 구매는 레벨 미달/재화 부족/중복 구매 각각 서버에서 막힌다.
- 다른 계정의 진행도·인벤토리는 조회할 수 없다(RLS).
