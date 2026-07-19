-- Fix the admin grant history aggregate ordering after created_at is aliased to createdAt.
begin;

create or replace function public.admin_list_benefit_grants(p_admin_user_id uuid, p_limit integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_result jsonb;
begin
  if not exists (
    select 1 from public.app_admins
    where user_id = p_admin_user_id and active and role in ('owner', 'admin', 'support')
  ) then
    raise exception 'ADMIN_FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(grant_row) order by grant_row."createdAt" desc), '[]'::jsonb)
  into v_result
  from (
    select id, recipient_email as "recipientEmail", benefit_type as "benefitType",
      benefit_key as "benefitKey", amount, expires_at as "expiresAt", reason,
      created_at as "createdAt", revoked_at as "revokedAt"
    from public.admin_benefit_grants
    order by created_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  ) grant_row;

  return v_result;
end;
$$;

revoke all on function public.admin_list_benefit_grants(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_list_benefit_grants(uuid, integer) to service_role;

commit;
