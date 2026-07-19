begin;

alter table public.notifications
  add column if not exists kind text not null default 'general',
  add column if not exists related_entity_type text,
  add column if not exists related_entity_id uuid;

drop policy if exists "notifications_own_rows" on public.notifications;
drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_select_own
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy notifications_update_own
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke insert, delete on table public.notifications from anon, authenticated;
grant select, update on table public.notifications to authenticated;

create or replace function public.notify_admin_benefit_grant()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text;
  v_body text;
begin
  if new.benefit_type = 'ai_points' then
    v_title := '리타 포인트 선물이 도착했어요';
    v_body := new.amount || '포인트가 왕실 계정에 지급되었습니다.';
  elsif new.benefit_type = 'cosmetic' then
    v_title := '새로운 꾸미기 선물이 도착했어요';
    v_body := new.benefit_key || ' 이용권이 지급되었습니다.';
  else
    v_title := '왕실 전체 이용권이 도착했어요';
    v_body := '전체 기능 이용권이 계정에 지급되었습니다.';
  end if;

  if nullif(trim(new.reason), '') is not null then
    v_body := v_body || ' · ' || left(trim(new.reason), 160);
  end if;

  insert into public.notifications (
    user_id, title, body, kind, related_entity_type, related_entity_id
  ) values (
    new.recipient_user_id, v_title, v_body, 'benefit_grant', 'admin_benefit_grant', new.id
  );
  return new;
end;
$$;

revoke all on function public.notify_admin_benefit_grant() from public, anon, authenticated;
drop trigger if exists notify_admin_benefit_grant_after_insert on public.admin_benefit_grants;
create trigger notify_admin_benefit_grant_after_insert
after insert on public.admin_benefit_grants
for each row execute function public.notify_admin_benefit_grant();

create or replace function public.get_my_ai_activity(p_limit integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 100);
  v_usage jsonb;
  v_gifts jsonb;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000';
  end if;

  select coalesce(jsonb_agg(to_jsonb(activity_row) order by activity_row."createdAt" desc), '[]'::jsonb)
  into v_usage
  from (
    select id, request_type as "requestType", model, points, status,
      input_tokens as "inputTokens", output_tokens as "outputTokens",
      estimated_cost_usd as "estimatedCostUsd", created_at as "createdAt",
      completed_at as "completedAt"
    from public.ai_usage_ledger
    where user_id = v_user_id
    order by created_at desc
    limit v_limit
  ) activity_row;

  select coalesce(jsonb_agg(to_jsonb(gift_row) order by gift_row."createdAt" desc), '[]'::jsonb)
  into v_gifts
  from (
    select id, benefit_type as "benefitType", benefit_key as "benefitKey",
      amount, expires_at as "expiresAt", reason, created_at as "createdAt"
    from public.admin_benefit_grants
    where recipient_user_id = v_user_id and revoked_at is null
    order by created_at desc
    limit v_limit
  ) gift_row;

  return jsonb_build_object('usage', v_usage, 'gifts', v_gifts);
end;
$$;

revoke all on function public.get_my_ai_activity(integer) from public, anon;
grant execute on function public.get_my_ai_activity(integer) to authenticated;

commit;
