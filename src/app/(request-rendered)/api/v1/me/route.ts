import { NextRequest } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { apiResponse, runPublicApi } from '@/lib/public-api';

async function getMe(request: NextRequest): Promise<Response> {
  return runPublicApi(request, '/api/v1/me', 'read', undefined, async ({ sql, userId }) => {
    const rows = await sql`
      select id::text, public_handle, member_since::text, created_at::text
      from public.profiles
      where id = ${userId}::uuid
      limit 1
    ` as Array<{ id: string; public_handle: string | null; member_since: string | null; created_at: string }>;
    const profile = rows[0];
    return apiResponse({
      id: userId,
      handle: profile?.public_handle ?? null,
      memberSince: profile?.member_since ?? profile?.created_at ?? null,
    });
  });
}

export const GET = withObservedRouteHandler('/api/v1/me', 'api', getMe);
