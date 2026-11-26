import type { SupabaseRequestUser } from './server-auth';
import { isAllowedSupabaseUserId } from './server-auth';
import type { SupabaseSql } from './database';

export type { SupabaseRequestUser } from './server-auth';
export { getSupabaseUserFromRequest } from './server-auth';

/**
 * Idempotently provisions the authenticated user's app rows without changing
 * an existing profile or snapshot. Callers must first use the server auth
 * helper, which enforces the verified temporary owner allowlist.
 */
export async function ensureSupabaseUser(sql: SupabaseSql, user: SupabaseRequestUser): Promise<boolean> {
  if (!isAllowedSupabaseUserId(user.id)) return false;

  const metadata = user.user_metadata;
  const rawName = typeof metadata.name === 'string'
    ? metadata.name
    : typeof metadata.display_name === 'string' ? metadata.display_name : null;
  const name = rawName?.trim().slice(0, 120) || null;
  const email = user.email.trim().slice(0, 320) || null;

  interface AccountStateRow {
    deletion_state: 'active' | 'pending' | 'deleted';
  }

  const [, stateRows, , , readyRows] = await sql.transaction((tx) => [
    tx`
      insert into app.users (id)
      values (${user.id}::uuid)
      on conflict (id) do nothing
    `,
    tx`
      select deletion_state
      from app.users
      where id = ${user.id}::uuid
      for update
    `,
    tx`
      insert into public.profiles (id, name, email)
      select ${user.id}::uuid, ${name}, ${email}
      from app.users
      where id = ${user.id}::uuid
        and deletion_state = 'active'
      on conflict (id) do nothing
    `,
    tx`
      insert into public.user_state (user_id)
      select ${user.id}::uuid
      from app.users
      where id = ${user.id}::uuid
        and deletion_state = 'active'
      on conflict (user_id) do nothing
    `,
    tx`
      select
        exists (select 1 from public.profiles where id = ${user.id}::uuid) as profile_exists,
        exists (select 1 from public.user_state where user_id = ${user.id}::uuid) as user_state_exists
      from app.users
      where id = ${user.id}::uuid
        and deletion_state = 'active'
    `,
  ]) as [unknown[], AccountStateRow[], unknown[], unknown[], Array<{ profile_exists: boolean; user_state_exists: boolean }>];

  return stateRows[0]?.deletion_state === 'active'
    && readyRows[0]?.profile_exists === true
    && readyRows[0]?.user_state_exists === true;
}
