insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'athlete-set-videos',
  'athlete-set-videos',
  false,
  26214400,
  array['video/mp4', 'video/webm', 'video/quicktime']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.athlete_set_videos (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  assigned_workout_id uuid not null references public.assigned_workouts(id) on delete cascade,
  workout_exercise_id uuid not null,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  constraint athlete_set_videos_storage_path_matches_owner
    check (split_part(storage_path, '/', 1) = athlete_id::text)
);

create index if not exists athlete_set_videos_assignment_exercise_created_idx
  on public.athlete_set_videos (assigned_workout_id, workout_exercise_id, created_at desc);

alter table public.athlete_set_videos enable row level security;

revoke all on public.athlete_set_videos from anon, public;
grant select, insert, delete on public.athlete_set_videos to authenticated;

create policy "Athletes and their coaches can view set videos"
  on public.athlete_set_videos
  for select
  to authenticated
  using (
    athlete_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles athlete
      where athlete.id = athlete_set_videos.athlete_id
        and athlete.trainer_id = (select auth.uid())
        and athlete.role = 'athlete'
    )
  );

create policy "Athletes can register their own set videos"
  on public.athlete_set_videos
  for insert
  to authenticated
  with check (
    athlete_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles athlete
      where athlete.id = (select auth.uid())
        and athlete.role = 'athlete'
    )
    and exists (
      select 1
      from public.assigned_workouts assignment
      where assignment.id = assigned_workout_id
        and assignment.athlete_id = (select auth.uid())
    )
  );

create policy "Athletes can delete their own set video records"
  on public.athlete_set_videos
  for delete
  to authenticated
  using (
    athlete_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles athlete
      where athlete.id = (select auth.uid())
        and athlete.role = 'athlete'
    )
  );

create policy "Athletes can upload set videos to their own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'athlete-set-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles athlete
      where athlete.id = (select auth.uid())
        and athlete.role = 'athlete'
    )
  );

create policy "Athletes can delete set videos from their own folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'athlete-set-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles athlete
      where athlete.id = (select auth.uid())
        and athlete.role = 'athlete'
    )
  );

create policy "Athletes and their coaches can read set videos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'athlete-set-videos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1
        from public.profiles athlete
        where athlete.id::text = (storage.foldername(name))[1]
          and athlete.trainer_id = (select auth.uid())
          and athlete.role = 'athlete'
      )
    )
  );
