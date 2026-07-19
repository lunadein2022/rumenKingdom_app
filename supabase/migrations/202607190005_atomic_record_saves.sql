begin;

create or replace function public.save_diary_with_snapshots(
  p_entry jsonb,
  p_snapshots jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid := (p_entry ->> 'id')::uuid;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;

  insert into public.diary_entries (
    id, user_id, entry_date, title, body, mood, favorite, tags, created_at, updated_at
  ) values (
    v_id,
    v_user_id,
    (p_entry ->> 'entry_date')::date,
    coalesce(p_entry ->> 'title', ''),
    coalesce(p_entry ->> 'body', ''),
    coalesce(p_entry ->> 'mood', ''),
    coalesce((p_entry ->> 'favorite')::boolean, false),
    coalesce(p_entry -> 'tags', '[]'::jsonb),
    coalesce((p_entry ->> 'created_at')::timestamptz, now()),
    coalesce((p_entry ->> 'updated_at')::timestamptz, now())
  )
  on conflict (id) do update set
    entry_date = excluded.entry_date,
    title = excluded.title,
    body = excluded.body,
    mood = excluded.mood,
    favorite = excluded.favorite,
    tags = excluded.tags,
    updated_at = excluded.updated_at
  where public.diary_entries.user_id = v_user_id;

  delete from public.diary_quest_links where user_id = v_user_id and diary_id = v_id;
  insert into public.diary_quest_links (
    user_id, diary_id, quest_id, source_quest_id, snapshot_title, snapshot_note, imported_at
  )
  select
    v_user_id,
    v_id,
    case when exists (
      select 1 from public.quests q where q.id = snapshot.source_quest_id and q.user_id = v_user_id
    ) then snapshot.source_quest_id else null end,
    snapshot.source_quest_id,
    snapshot.title,
    coalesce(snapshot.note, ''),
    coalesce(snapshot.imported_at, now())
  from jsonb_to_recordset(coalesce(p_snapshots, '[]'::jsonb)) as snapshot(
    source_quest_id uuid,
    title text,
    note text,
    imported_at timestamptz
  );

  return v_id;
end;
$$;

create or replace function public.create_memo_with_attachment(
  p_memo jsonb,
  p_attachment jsonb default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid := (p_memo ->> 'id')::uuid;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if nullif(trim(p_memo ->> 'title'), '') is null then
    raise exception 'Memo title is required' using errcode = '23514';
  end if;

  insert into public.memos (
    id, user_id, main_quest_id, title, content, transcript, status, source,
    important, favorite, tags, created_at, updated_at
  ) values (
    v_id,
    v_user_id,
    nullif(p_memo ->> 'main_quest_id', '')::uuid,
    trim(p_memo ->> 'title'),
    coalesce(p_memo ->> 'content', ''),
    nullif(p_memo ->> 'transcript', ''),
    coalesce(nullif(p_memo ->> 'status', ''), 'normal'),
    coalesce(nullif(p_memo ->> 'source', ''), 'manual'),
    coalesce((p_memo ->> 'important')::boolean, false),
    coalesce((p_memo ->> 'favorite')::boolean, false),
    coalesce(p_memo -> 'tags', '[]'::jsonb),
    coalesce((p_memo ->> 'created_at')::timestamptz, now()),
    coalesce((p_memo ->> 'updated_at')::timestamptz, now())
  );

  if p_attachment is not null and nullif(p_attachment ->> 'storage_path', '') is not null then
    insert into public.attachments (user_id, entity_type, entity_id, storage_path, file_name, mime_type, size_bytes)
    values (
      v_user_id,
      'memo',
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

revoke all on function public.save_diary_with_snapshots(jsonb, jsonb) from public;
revoke all on function public.create_memo_with_attachment(jsonb, jsonb) from public;
grant execute on function public.save_diary_with_snapshots(jsonb, jsonb) to authenticated;
grant execute on function public.create_memo_with_attachment(jsonb, jsonb) to authenticated;

commit;
