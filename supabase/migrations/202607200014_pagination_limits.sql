-- Keep enough shared release history available for 20-item client pages.
-- This is a separate migration so projects that already ran 013 receive the change.
create or replace function public.get_public_app_bootstrap(p_platform text default 'web')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  platform_name text := case when p_platform in ('web', 'ios', 'android') then p_platform else 'web' end;
  config_value jsonb;
begin
  select to_jsonb(config) - 'updated_by' into config_value
  from public.app_runtime_config config where environment = 'production';
  return jsonb_build_object(
    'config', coalesce(config_value, '{}'::jsonb),
    'announcements', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.severity desc, item.starts_at desc)
      from (
        select id, kind, severity, title, message, action_label, action_url,
               starts_at, ends_at, dismissible, updated_at
        from public.app_announcements
        where is_published and starts_at <= now()
          and (ends_at is null or ends_at > now())
          and platforms @> array[platform_name]
      ) item
    ), '[]'::jsonb),
    'catalog', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.sort_order, item.product_key)
      from (
        select product_key, category, title, description, price_krw,
               entitlement_key, image_url, platforms, metadata
        from public.app_catalog_items
        where active and platforms @> array[platform_name]
      ) item
    ), '[]'::jsonb),
    'releases', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.published_at desc)
      from (
        select version, title, items, release_date, published_at,
               minimum_versions, force_update
        from public.app_releases
        where is_published and published_at <= now()
          and platforms @> array[platform_name]
        order by published_at desc limit 100
      ) item
    ), '[]'::jsonb),
    'serverTime', now()
  );
end;
$$;

revoke all on function public.get_public_app_bootstrap(text) from public;
grant execute on function public.get_public_app_bootstrap(text) to anon, authenticated, service_role;
