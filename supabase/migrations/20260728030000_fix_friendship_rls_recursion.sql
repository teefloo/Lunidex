-- PrimeDex — fix recursive friendship policies during request mutations
--
-- The friendship INSERT policy checks friend_directory, while the directory
-- SELECT policy checks friendships. Running the mutation as the authenticated
-- invoker makes PostgreSQL evaluate that cycle and reject the request.

create or replace function public.send_friend_request(p_handle text)
returns public.friendships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_target_id uuid;
  v_existing public.friendships;
  v_result public.friendships;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select user_id into v_target_id
  from public.friend_directory
  where lower(handle) = lower(trim(p_handle))
    and allow_friend_requests = true;

  if v_target_id is null then raise exception 'Friend handle not found'; end if;
  if v_target_id = v_user_id then raise exception 'Cannot add yourself'; end if;

  select * into v_existing
  from public.friendships
  where least(requester_id, addressee_id) = least(v_user_id, v_target_id)
    and greatest(requester_id, addressee_id) = greatest(v_user_id, v_target_id);

  if v_existing.status in ('accepted', 'pending') then
    return v_existing;
  end if;

  if v_existing.id is not null then
    delete from public.friendships where id = v_existing.id;
  end if;

  insert into public.friendships (requester_id, addressee_id, status)
  values (v_user_id, v_target_id, 'pending')
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.respond_to_friend_request(
  p_friendship_id uuid,
  p_action text
)
returns public.friendships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.friendships;
begin
  if p_action not in ('accept', 'decline') then
    raise exception 'Invalid friend request action';
  end if;

  update public.friendships
  set status = case when p_action = 'accept' then 'accepted' else 'declined' end,
      responded_at = now()
  where id = p_friendship_id
    and addressee_id = (select auth.uid())
    and status = 'pending'
  returning * into v_result;

  if v_result.id is null then raise exception 'Friend request not found'; end if;
  return v_result;
end;
$$;

revoke all on function public.send_friend_request(text) from public;
grant execute on function public.send_friend_request(text) to authenticated;
revoke all on function public.respond_to_friend_request(uuid, text) from public;
grant execute on function public.respond_to_friend_request(uuid, text) to authenticated;
