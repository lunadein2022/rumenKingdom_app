-- Cross-platform synchronization, account lifecycle, attachment cleanup and
-- store-purchase ownership for web, iOS and Android.
begin;

create table if not exists public.sync_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  platform text not null check (platform in ('web', 'ios', 'android')),
  app_version text not null default '',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

create table if not exists public.sync_mutation_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  mutation_id uuid not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, device_id, mutation_id),
  foreign key (user_id, device_id) references public.sync_devices(user_id, device_id) on delete cascade
);

create table if not exists public.sync_change_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  record_id uuid not null,
  operation text not null check (operation in ('create', 'update', 'delete')),
  revision bigint not null,
  record jsonb,
  changed_at timestamptz not null default now()
);
create index if not exists sync_change_log_owner_cursor_idx
  on public.sync_change_log(user_id, id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'main_quests', 'quests', 'calendar_events', 'diary_entries', 'memos',
    'relationships', 'relationship_groups'
  ] loop
    execute format(
      'alter table public.%I add column if not exists revision bigint not null default 1',
      table_name
    );
  end loop;
end;
$$;

create or replace function public.bump_sync_revision()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.log_sync_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row_value record;
  entity_name text;
begin
  if tg_op = 'DELETE' then row_value := old; else row_value := new; end if;
  entity_name := case tg_table_name
    when 'main_quests' then 'project'
    when 'calendar_events' then 'calendar_event'
    when 'diary_entries' then 'diary'
    when 'relationship_groups' then 'relationship_group'
    else regexp_replace(tg_table_name, 's$', '')
  end;

  insert into public.sync_change_log(
    user_id, entity_type, record_id, operation, revision, record
  ) values (
    row_value.user_id,
    entity_name,
    row_value.id,
    case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' else 'delete' end,
    row_value.revision,
    case when tg_op = 'DELETE' then null else to_jsonb(row_value) end
  );
  return row_value;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'main_quests', 'quests', 'calendar_events', 'diary_entries', 'memos',
    'relationships', 'relationship_groups'
  ] loop
    execute format('drop trigger if exists %I_sync_revision on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_sync_revision before update on public.%I for each row execute function public.bump_sync_revision()',
      table_name, table_name
    );
    execute format('drop trigger if exists %I_sync_log on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_sync_log after insert or update or delete on public.%I for each row execute function public.log_sync_change()',
      table_name, table_name
    );
  end loop;
end;
$$;

create or replace function public.apply_sync_mutation(
  p_device_id uuid,
  p_mutation_id uuid,
  p_platform text,
  p_app_version text,
  p_entity_type text,
  p_operation text,
  p_record_id uuid,
  p_expected_revision bigint default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_id uuid := auth.uid();
  table_name text;
  clean_payload jsonb;
  diary_snapshots jsonb;
  relationship_group_ids jsonb;
  relationship_attachment jsonb;
  assignments text;
  insert_columns text;
  insert_values text;
  server_record jsonb;
  response_value jsonb;
begin
  if owner_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_device_id is null or p_mutation_id is null or p_record_id is null then
    raise exception 'invalid_sync_identifiers' using errcode = '22023';
  end if;
  if p_platform not in ('web', 'ios', 'android') then
    raise exception 'invalid_platform' using errcode = '22023';
  end if;
  if p_operation not in ('create', 'update', 'delete') then
    raise exception 'invalid_operation' using errcode = '22023';
  end if;

  table_name := case p_entity_type
    when 'project' then 'main_quests'
    when 'quest' then 'quests'
    when 'calendar_event' then 'calendar_events'
    when 'diary' then 'diary_entries'
    when 'memo' then 'memos'
    when 'relationship' then 'relationships'
    when 'relationship_group' then 'relationship_groups'
    else null
  end;
  if table_name is null then raise exception 'invalid_entity_type' using errcode = '22023'; end if;

  insert into public.sync_devices(user_id, device_id, platform, app_version, last_seen_at)
  values (owner_id, p_device_id, p_platform, left(coalesce(p_app_version, ''), 40), now())
  on conflict (user_id, device_id) do update
  set platform = excluded.platform, app_version = excluded.app_version, last_seen_at = now();

  select response into response_value
  from public.sync_mutation_receipts
  where user_id = owner_id and device_id = p_device_id and mutation_id = p_mutation_id;
  if response_value is not null then return response_value; end if;

  diary_snapshots := coalesce(p_payload -> 'quest_snapshots', '[]'::jsonb);
  relationship_group_ids := coalesce(p_payload -> 'group_ids', '[]'::jsonb);
  relationship_attachment := p_payload -> 'attachment';
  clean_payload := coalesce(p_payload, '{}'::jsonb)
    - 'id' - 'user_id' - 'revision' - 'created_at' - 'updated_at'
    - 'quest_snapshots' - 'group_ids' - 'attachment';

  if p_operation = 'create' then
    select
      string_agg(format('%I', attribute.attname), ', ' order by attribute.attnum),
      string_agg(
        format('(jsonb_populate_record(null::public.%I, $1)).%I', table_name, attribute.attname),
        ', ' order by attribute.attnum
      )
    into insert_columns, insert_values
    from pg_attribute attribute
    where attribute.attrelid = format('public.%I', table_name)::regclass
      and attribute.attnum > 0 and not attribute.attisdropped
      and clean_payload ? attribute.attname;

    if insert_columns is null then raise exception 'empty_create_payload' using errcode = '22023'; end if;
    execute format(
      'insert into public.%I (id, user_id, %s) select $2, $3, %s returning to_jsonb(%I.*)',
      table_name, insert_columns, insert_values, table_name
    ) into server_record using clean_payload, p_record_id, owner_id;
  elsif p_operation = 'update' then
    if p_expected_revision is null then
      raise exception 'expected_revision_required' using errcode = '22023';
    end if;
    select string_agg(
      format('%1$I = (jsonb_populate_record(t, $1)).%1$I', attribute.attname),
      ', ' order by attribute.attnum
    ) into assignments
    from pg_attribute attribute
    where attribute.attrelid = format('public.%I', table_name)::regclass
      and attribute.attnum > 0 and not attribute.attisdropped
      and attribute.attname not in ('id', 'user_id', 'revision', 'created_at', 'updated_at')
      and clean_payload ? attribute.attname;

    if assignments is null then raise exception 'empty_update_payload' using errcode = '22023'; end if;
    execute format(
      'update public.%I t set %s where t.id = $2 and t.user_id = $3 and t.revision = $4 returning to_jsonb(t.*)',
      table_name, assignments
    ) into server_record using clean_payload, p_record_id, owner_id, p_expected_revision;
  else
    if p_expected_revision is null then
      raise exception 'expected_revision_required' using errcode = '22023';
    end if;
    execute format(
      'delete from public.%I t where t.id = $1 and t.user_id = $2 and t.revision = $3 returning to_jsonb(t.*)',
      table_name
    ) into server_record using p_record_id, owner_id, p_expected_revision;
  end if;

  if server_record is not null and p_entity_type = 'diary' and p_operation <> 'delete'
     and coalesce(p_payload, '{}'::jsonb) ? 'quest_snapshots' then
    delete from public.diary_quest_links
    where user_id = owner_id and diary_id = p_record_id;
    insert into public.diary_quest_links(
      user_id, diary_id, quest_id, source_quest_id,
      snapshot_title, snapshot_note, imported_at
    )
    select
      owner_id, p_record_id, quest.id, snapshot.source_quest_id,
      left(coalesce(snapshot.title, ''), 500), coalesce(snapshot.note, ''),
      coalesce(snapshot.imported_at, now())
    from jsonb_to_recordset(diary_snapshots) as snapshot(
      source_quest_id uuid, title text, note text, imported_at timestamptz
    )
    left join public.quests quest
      on quest.id = snapshot.source_quest_id and quest.user_id = owner_id
    where snapshot.source_quest_id is not null;
  end if;

  if server_record is not null and p_entity_type = 'relationship' and p_operation <> 'delete'
     and coalesce(p_payload, '{}'::jsonb) ? 'group_ids' then
    delete from public.relationship_group_members
    where user_id = owner_id and relationship_id = p_record_id;
    insert into public.relationship_group_members(user_id, relationship_id, group_id)
    select owner_id, p_record_id, owned.id
    from (
      select distinct value::uuid as id
      from jsonb_array_elements_text(relationship_group_ids)
      where value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ) requested
    join public.relationship_groups owned
      on owned.id = requested.id and owned.user_id = owner_id;
  end if;

  if server_record is not null and p_entity_type = 'relationship' and p_operation <> 'delete'
     and relationship_attachment is not null
     and nullif(relationship_attachment ->> 'storage_path', '') is not null then
    delete from public.attachments
    where user_id = owner_id and entity_type = 'relationship' and entity_id = p_record_id;
    insert into public.attachments(
      user_id, entity_type, entity_id, storage_path, file_name, mime_type, size_bytes
    ) values (
      owner_id, 'relationship', p_record_id,
      relationship_attachment ->> 'storage_path',
      coalesce(nullif(relationship_attachment ->> 'file_name', ''), 'attachment'),
      nullif(relationship_attachment ->> 'mime_type', ''),
      nullif(relationship_attachment ->> 'size_bytes', '')::bigint
    );
  end if;

  if server_record is null then
    execute format(
      'select to_jsonb(t.*) from public.%I t where t.id = $1 and t.user_id = $2',
      table_name
    ) into server_record using p_record_id, owner_id;
    response_value := jsonb_build_object(
      'status', case when server_record is null then 'not_found' else 'conflict' end,
      'entityType', p_entity_type,
      'recordId', p_record_id,
      'expectedRevision', p_expected_revision,
      'serverRecord', server_record
    );
  else
    response_value := jsonb_build_object(
      'status', 'applied',
      'entityType', p_entity_type,
      'recordId', p_record_id,
      'operation', p_operation,
      'record', case when p_operation = 'delete' then null else server_record end,
      'revision', (server_record ->> 'revision')::bigint
    );
  end if;

  insert into public.sync_mutation_receipts(user_id, device_id, mutation_id, response)
  values (owner_id, p_device_id, p_mutation_id, response_value)
  on conflict (user_id, device_id, mutation_id) do nothing;
  return response_value;
end;
$$;

create or replace function public.get_sync_changes(
  p_after_id bigint default 0,
  p_limit integer default 500
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  with rows as (
    select id, entity_type, record_id, operation, revision, record, changed_at
    from public.sync_change_log
    where user_id = auth.uid() and id > greatest(coalesce(p_after_id, 0), 0)
    order by id
    limit least(greatest(coalesce(p_limit, 500), 1), 1000)
  )
  select jsonb_build_object(
    'changes', coalesce(jsonb_agg(to_jsonb(rows) order by id), '[]'::jsonb),
    'nextCursor', coalesce(max(id), greatest(coalesce(p_after_id, 0), 0))
  ) from rows;
$$;

create table if not exists public.storage_cleanup_queue (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_id text not null check (bucket_id in ('rita-attachments', 'room-backgrounds')),
  storage_path text not null,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists storage_cleanup_pending_idx
  on public.storage_cleanup_queue(id) where processed_at is null;

create or replace function public.enqueue_removed_storage_object()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  old_path text;
begin
  old_path := old.storage_path;
  if tg_op = 'UPDATE' and old_path is not distinct from new.storage_path then return new; end if;
  -- The service-role cleanup worker must never be tricked into deleting another
  -- account's object through client-controlled attachment metadata.
  if old_path is null or old_path not like (old.user_id::text || '/%') then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  insert into public.storage_cleanup_queue(user_id, bucket_id, storage_path)
  values (old.user_id, tg_argv[0], old_path);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists attachments_cleanup_queue on public.attachments;
create trigger attachments_cleanup_queue
after update of storage_path or delete on public.attachments
for each row execute function public.enqueue_removed_storage_object('rita-attachments');

drop trigger if exists room_backgrounds_cleanup_queue on public.room_backgrounds;
create trigger room_backgrounds_cleanup_queue
after update of storage_path or delete on public.room_backgrounds
for each row execute function public.enqueue_removed_storage_object('room-backgrounds');

create or replace function public.delete_entity_attachments()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.attachments
  where user_id = old.user_id and entity_type = tg_argv[0] and entity_id = old.id;
  return old;
end;
$$;

drop trigger if exists memos_delete_attachments on public.memos;
create trigger memos_delete_attachments
after delete on public.memos for each row execute function public.delete_entity_attachments('memo');
drop trigger if exists relationships_delete_attachments on public.relationships;
create trigger relationships_delete_attachments
after delete on public.relationships for each row execute function public.delete_entity_attachments('relationship');

create table if not exists public.store_products (
  platform text not null check (platform in ('apple', 'google')),
  product_id text not null,
  entitlement_key text not null check (char_length(entitlement_key) between 1 and 80),
  plan_key text not null check (plan_key in ('royal', 'royal_ai', 'theme')),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (platform, product_id)
);

create table if not exists public.store_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('apple', 'google')),
  product_id text not null,
  external_transaction_id text not null,
  original_transaction_id text,
  status text not null check (status in ('active', 'expired', 'revoked', 'refunded', 'pending')),
  purchased_at timestamptz,
  expires_at timestamptz,
  verified_at timestamptz not null default now(),
  environment text not null default 'production' check (environment in ('sandbox', 'production')),
  payload jsonb not null default '{}'::jsonb,
  unique (platform, external_transaction_id),
  foreign key (platform, product_id) references public.store_products(platform, product_id)
);
create index if not exists store_transactions_owner_idx
  on public.store_transactions(user_id, verified_at desc);

create table if not exists public.user_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('apple', 'google')),
  product_id text not null,
  original_transaction_id text not null,
  status text not null check (status in ('active', 'expired', 'revoked', 'refunded', 'pending')),
  current_period_end timestamptz,
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (platform, original_transaction_id),
  foreign key (platform, product_id) references public.store_products(platform, product_id)
);
create index if not exists user_subscriptions_owner_idx
  on public.user_subscriptions(user_id, status, current_period_end desc);

create or replace function public.record_verified_store_transaction(
  p_user_id uuid,
  p_platform text,
  p_product_id text,
  p_external_transaction_id text,
  p_original_transaction_id text,
  p_status text,
  p_purchased_at timestamptz,
  p_expires_at timestamptz,
  p_environment text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  entitlement text;
  transaction_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_status not in ('active', 'expired', 'revoked', 'refunded', 'pending') then
    raise exception 'invalid_store_status' using errcode = '22023';
  end if;
  select entitlement_key into entitlement
  from public.store_products
  where platform = p_platform and product_id = p_product_id and active;
  if entitlement is null then raise exception 'unknown_store_product' using errcode = '22023'; end if;

  insert into public.store_transactions(
    user_id, platform, product_id, external_transaction_id,
    original_transaction_id, status, purchased_at, expires_at, environment, payload
  ) values (
    p_user_id, p_platform, p_product_id, p_external_transaction_id,
    p_original_transaction_id, p_status, p_purchased_at, p_expires_at,
    p_environment, coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (platform, external_transaction_id) do update
  set status = excluded.status, expires_at = excluded.expires_at,
      verified_at = now(), payload = excluded.payload
  returning id into transaction_id;

  insert into public.user_subscriptions(
    user_id, platform, product_id, original_transaction_id, status,
    current_period_end, last_verified_at, updated_at
  ) values (
    p_user_id, p_platform, p_product_id, p_original_transaction_id, p_status,
    p_expires_at, now(), now()
  )
  on conflict (platform, original_transaction_id) do update
  set user_id = excluded.user_id, product_id = excluded.product_id,
      status = excluded.status, current_period_end = excluded.current_period_end,
      last_verified_at = now(), updated_at = now();

  if p_status = 'active' and (p_expires_at is null or p_expires_at > now()) then
    update public.user_entitlements
    set expires_at = p_expires_at, revoked_at = null,
        metadata = jsonb_build_object(
          'source', 'store', 'platform', p_platform,
          'storeOriginalTransactionId', p_original_transaction_id,
          'lastTransactionId', transaction_id
        )
    where user_id = p_user_id and entitlement_key = entitlement
      and metadata ->> 'source' = 'store'
      and metadata ->> 'platform' = p_platform
      and metadata ->> 'storeOriginalTransactionId' = p_original_transaction_id;
    if not found then
      insert into public.user_entitlements(user_id, entitlement_key, expires_at, metadata)
      values (
        p_user_id, entitlement, p_expires_at,
        jsonb_build_object(
          'source', 'store', 'platform', p_platform,
          'storeOriginalTransactionId', p_original_transaction_id,
          'lastTransactionId', transaction_id
        )
      );
    end if;
  else
    update public.user_entitlements
    set revoked_at = now()
    where user_id = p_user_id and entitlement_key = entitlement
      and revoked_at is null
      and metadata ->> 'source' = 'store'
      and metadata ->> 'platform' = p_platform
      and metadata ->> 'storeOriginalTransactionId' = p_original_transaction_id;
  end if;

  return jsonb_build_object(
    'transactionId', transaction_id,
    'entitlementKey', entitlement,
    'status', p_status
  );
end;
$$;

alter table public.sync_devices enable row level security;
alter table public.sync_mutation_receipts enable row level security;
alter table public.sync_change_log enable row level security;
alter table public.storage_cleanup_queue enable row level security;
alter table public.store_products enable row level security;
alter table public.store_transactions enable row level security;
alter table public.user_subscriptions enable row level security;

drop policy if exists sync_devices_own_read on public.sync_devices;
create policy sync_devices_own_read on public.sync_devices for select to authenticated using (auth.uid() = user_id);
drop policy if exists sync_change_log_own_read on public.sync_change_log;
create policy sync_change_log_own_read on public.sync_change_log for select to authenticated using (auth.uid() = user_id);
drop policy if exists store_products_client_read on public.store_products;
create policy store_products_client_read on public.store_products for select to authenticated using (active);
drop policy if exists store_transactions_own_read on public.store_transactions;
create policy store_transactions_own_read on public.store_transactions for select to authenticated using (auth.uid() = user_id);
drop policy if exists user_subscriptions_own_read on public.user_subscriptions;
create policy user_subscriptions_own_read on public.user_subscriptions for select to authenticated using (auth.uid() = user_id);

revoke all on public.sync_devices, public.sync_mutation_receipts, public.sync_change_log,
  public.storage_cleanup_queue, public.store_products, public.store_transactions,
  public.user_subscriptions from public, anon, authenticated;
grant select on public.sync_devices, public.sync_change_log, public.store_products,
  public.store_transactions, public.user_subscriptions to authenticated;
grant all on public.sync_devices, public.sync_mutation_receipts, public.sync_change_log,
  public.storage_cleanup_queue, public.store_products, public.store_transactions,
  public.user_subscriptions to service_role;

revoke all on function public.apply_sync_mutation(uuid,uuid,text,text,text,text,uuid,bigint,jsonb) from public, anon;
grant execute on function public.apply_sync_mutation(uuid,uuid,text,text,text,text,uuid,bigint,jsonb) to authenticated, service_role;
revoke all on function public.get_sync_changes(bigint,integer) from public, anon;
grant execute on function public.get_sync_changes(bigint,integer) to authenticated, service_role;
revoke all on function public.record_verified_store_transaction(uuid,text,text,text,text,text,timestamptz,timestamptz,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.record_verified_store_transaction(uuid,text,text,text,text,text,timestamptz,timestamptz,text,jsonb)
  to service_role;

commit;
