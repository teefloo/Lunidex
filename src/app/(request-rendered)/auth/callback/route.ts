import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

const SUPPORTED_LOCALES = new Set(['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh']);

function safeNextPath(value: string | null, locale: string): string {
  if (value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) return value;
  const safeLocale = SUPPORTED_LOCALES.has(locale) ? locale : 'en';
  return `/${safeLocale}/dashboard`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const locale = request.nextUrl.pathname.split('/').filter(Boolean)[0] ?? 'en';
  const destination = new URL(
    safeNextPath(request.nextUrl.searchParams.get('next'), locale),
    request.url,
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
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) destination.searchParams.set('auth', 'callback_error');
  return NextResponse.redirect(destination);
}
