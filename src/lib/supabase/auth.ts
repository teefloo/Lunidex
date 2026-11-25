import type { SupabaseRequestUser } from './server-auth';
import type { SupabaseSql } from './database';

export type { SupabaseRequestUser } from './server-auth';
export { getSupabaseUserFromRequest } from './server-auth';

/**
 * Maintains Lunidex's application-side identity projection. Supabase Auth owns
 * credentials and sessions; app.users remains the lifecycle/tombstone gate.
 */
export async function ensureSupabaseUser(sql: SupabaseSql, user: SupabaseRequestUser): Promise<boolean> {
  const metadata = user.user_metadata;
  const rawName = typeof metadata.name === 'string'
    ? metadata.name
    : typeof metadata.display_name === 'string' ? metadata.display_name : null;
  const name = rawName?.trim().slice(0, 120) || null;
  const email = user.email.trim().slice(0, 320) || null;

  interface AccountStateRow {
    deletion_state: 'active' | 'pending' | 'deleted';
  }

  const [, stateRows, profileRows] = await sql.transaction((tx) => [
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
      on conflict (id) do update set
        name = coalesce(excluded.name, public.profiles.name),
        email = coalesce(excluded.email, public.profiles.email),
        updated_at = now()
      returning id
    `,
  ]) as [unknown[], AccountStateRow[], Array<{ id: string }>];

  return stateRows[0]?.deletion_state === 'active' && Boolean(profileRows[0]);
}
