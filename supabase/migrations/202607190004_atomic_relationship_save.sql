begin;

-- Save the relationship body, group memberships, and attachment metadata in
-- one database transaction. Storage upload happens before this call; its
-- owner-scoped path is only referenced after every database write succeeds.
create or replace function public.save_relationship_with_groups(
  p_relationship jsonb,
  p_group_ids uuid[] default '{}'::uuid[],
  p_attachment jsonb default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid := (p_relationship ->> 'id')::uuid;
  v_invalid_group_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if nullif(trim(p_relationship ->> 'name'), '') is null then
    raise exception 'Relationship name is required' using errcode = '23514';
  end if;

  select count(*) into v_invalid_group_count
  from unnest(coalesce(p_group_ids, '{}'::uuid[])) requested(id)
  where not exists (
    select 1 from public.relationship_groups owned
    where owned.id = requested.id and owned.user_id = v_user_id
  );
  if v_invalid_group_count > 0 then
    raise exception 'A relationship group is missing or belongs to another account' using errcode = '23503';
  end if;

  insert into public.relationships (
    id, user_id, name, organization, position, phone, email, social, address,
    relationship_type, first_met_at, last_contacted_at, notes, tags, favorite,
    business_card_ocr_text, source, created_at, updated_at
  ) values (
    v_id,
    v_user_id,
    trim(p_relationship ->> 'name'),
    coalesce(p_relationship ->> 'organization', ''),
    coalesce(p_relationship ->> 'position', ''),
    coalesce(p_relationship ->> 'phone', ''),
    coalesce(p_relationship ->> 'email', ''),
    coalesce(p_relationship ->> 'social', ''),
    coalesce(p_relationship ->> 'address', ''),
    coalesce(p_relationship ->> 'relationship_type', ''),
    nullif(p_relationship ->> 'first_met_at', '')::date,
    nullif(p_relationship ->> 'last_contacted_at', '')::date,
    coalesce(p_relationship ->> 'notes', ''),
    coalesce(p_relationship -> 'tags', '[]'::jsonb),
    coalesce((p_relationship ->> 'favorite')::boolean, false),
    nullif(p_relationship ->> 'business_card_ocr_text', ''),
    coalesce(nullif(p_relationship ->> 'source', ''), 'manual'),
    coalesce((p_relationship ->> 'created_at')::timestamptz, now()),
    coalesce((p_relationship ->> 'updated_at')::timestamptz, now())
  )
  on conflict (id) do update set
    name = excluded.name,
    organization = excluded.organization,
    position = excluded.position,
    phone = excluded.phone,
    email = excluded.email,
    social = excluded.social,
    address = excluded.address,
    relationship_type = excluded.relationship_type,
    first_met_at = excluded.first_met_at,
    last_contacted_at = excluded.last_contacted_at,
    notes = excluded.notes,
    tags = excluded.tags,
    favorite = excluded.favorite,
    business_card_ocr_text = excluded.business_card_ocr_text,
    source = excluded.source,
    updated_at = excluded.updated_at
  where public.relationships.user_id = v_user_id;

  delete from public.relationship_group_members
  where user_id = v_user_id and relationship_id = v_id;

  insert into public.relationship_group_members (user_id, relationship_id, group_id)
  select v_user_id, v_id, requested.id
  from (select distinct unnest(coalesce(p_group_ids, '{}'::uuid[])) as id) requested;

  if p_attachment is not null and nullif(p_attachment ->> 'storage_path', '') is not null then
    delete from public.attachments
    where user_id = v_user_id and entity_type = 'relationship' and entity_id = v_id;
    insert into public.attachments (user_id, entity_type, entity_id, storage_path, file_name, mime_type, size_bytes)
    values (
      v_user_id,
      'relationship',
      v_id,
      p_attachment ->> 'storage_path',
      coalesce(nullif(p_attachment ->> 'file_name', ''), 'attachment'),
      nullif(p_attachment ->> 'mime_type', ''),
      nullif(p_attachment ->> 'size_bytes', '')::bigint
    );
  end if;

  return v_id;
end;
$$;

revoke all on function public.save_relationship_with_groups(jsonb, uuid[], jsonb) from public;
grant execute on function public.save_relationship_with_groups(jsonb, uuid[], jsonb) to authenticated;

commit;
