-- ONE-TIME DESTRUCTIVE RESET
-- Clears every user's Rumen Kingdom application data while preserving auth.users accounts.
-- Run manually in the Supabase SQL Editor only after reviewing the target project.
-- Do not add this file to schema.sql and do not run it during normal deployments.

begin;

delete from public.attachments;
delete from public.entity_tags;
delete from public.notifications;
delete from public.ai_conversations;
delete from public.calendar_events;
delete from public.diary_entries;
delete from public.relationships;
delete from public.tags;
delete from public.folders;
delete from public.daily_quests;
delete from public.sub_quests;
delete from public.main_quests;

-- Keep account rows, but return profile copy to its initial state.
update public.profiles
set display_name = '공주', timezone = 'Asia/Seoul', updated_at = now();

commit;

-- Storage objects in the private `rita-attachments` bucket must be emptied through
-- Supabase Storage (Dashboard or Storage API). Deleting storage.objects directly
-- can leave orphaned files and is intentionally not done in this SQL script.
