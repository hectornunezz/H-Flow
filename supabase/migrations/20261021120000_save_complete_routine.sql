create or replace function public.save_complete_routine(p_routine jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  routine_id uuid;
  block_data jsonb;
  exercise_data jsonb;
  block_id uuid;
begin
  if auth.uid() is null
     or (p_routine->>'trainer_id')::uuid is distinct from auth.uid() then
    raise exception 'Not authorized to save this routine';
  end if;

  if coalesce(p_routine->>'name', '') = ''
     or jsonb_typeof(p_routine->'blocks') is distinct from 'array'
     or jsonb_array_length(p_routine->'blocks') = 0 then
    raise exception 'Routine name and at least one block are required';
  end if;

  insert into public.routines (trainer_id, name, active)
  values (
    auth.uid(),
    p_routine->>'name',
    coalesce((p_routine->>'active')::boolean, true)
  )
  returning id into routine_id;

  for block_data in
    select value
    from jsonb_array_elements(p_routine->'blocks')
  loop
    insert into public.routine_blocks (routine_id, day_name, "order")
    values (
      routine_id,
      block_data->>'day_name',
      (block_data->>'order')::integer
    )
    returning id into block_id;

    if jsonb_typeof(block_data->'exercises') is distinct from 'array'
       or jsonb_array_length(block_data->'exercises') = 0 then
      raise exception 'Each routine block must contain exercises';
    end if;

    for exercise_data in
      select value
      from jsonb_array_elements(block_data->'exercises')
    loop
      insert into public.routine_exercises (
        block_id,
        exercise_id,
        sets,
        reps_target,
        rir_target,
        rest_time,
        intensity_technique,
        "order"
      )
      values (
        block_id,
        (exercise_data->>'exercise_id')::uuid,
        (exercise_data->>'sets')::integer,
        exercise_data->>'reps_target',
        nullif(exercise_data->>'rir_target', 'null')::integer,
        nullif(exercise_data->>'rest_time', 'null')::integer,
        nullif(exercise_data->>'intensity_technique', 'null'),
        (exercise_data->>'order')::integer
      );
    end loop;
  end loop;

  return routine_id;
end;
$$;

revoke all on function public.save_complete_routine(jsonb) from public;
grant execute on function public.save_complete_routine(jsonb) to authenticated;
