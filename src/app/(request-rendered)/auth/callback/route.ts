import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { SITE_URL } from '@/lib/site';
import { isAllowedSupabaseAuthUser } from '@/lib/supabase/server-auth';

export const runtime = 'nodejs';

const SUPPORTED_LOCALES = new Set(['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh']);

function safeNextPath(value: string | null, locale: string): string {
  if (value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) return value;
  const safeLocale = SUPPORTED_LOCALES.has(locale) ? locale : 'en';
  return `/${safeLocale}/dashboard`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Next can expose its internal listener origin (0.0.0.0:3000) to Route
  // Handlers behind the production proxy. Keep local callbacks on their
  // request origin, but always return production users to the canonical host.
  const redirectOrigin = process.env.NODE_ENV === 'production'
    ? SITE_URL
    : new URL(request.url).origin;
  const routeLocale = request.nextUrl.pathname.split('/').filter(Boolean)[0] ?? 'en';
  const locale = SUPPORTED_LOCALES.has(routeLocale) ? routeLocale : 'en';
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const isRecoveryCallback = request.nextUrl.searchParams.get('type') === 'recovery';
  const hasCallbackError = request.nextUrl.searchParams.get('auth') === 'callback_error'
    || ['error', 'error_code', 'error_description'].some((name) => request.nextUrl.searchParams.has(name));
  if (isRecoveryCallback) {
    // Do not verify a one-time token in a GET callback: mail providers may
    // prefetch it. The reset form verifies it only after an explicit submit.
    const resetDestination = new URL(`/${locale}/auth/reset-password?mode=recovery`, redirectOrigin);
    if (tokenHash && !hasCallbackError) {
      resetDestination.searchParams.set('token_hash', tokenHash);
    } else {
      resetDestination.searchParams.set('auth', 'callback_error');
    }
    return NextResponse.redirect(resetDestination);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const destination = new URL(
    safeNextPath(request.nextUrl.searchParams.get('next'), locale),
    redirectOrigin,
  );
  const code = request.nextUrl.searchParams.get('code');
  if (!supabaseUrl || !publishableKey || !code) {
    destination.searchParams.set('auth', 'callback_error');
    return NextResponse.redirect(destination);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user || !isAllowedSupabaseAuthUser(data.user)) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    destination.searchParams.set('auth', 'callback_error');
  }
  return NextResponse.redirect(destination);
}
