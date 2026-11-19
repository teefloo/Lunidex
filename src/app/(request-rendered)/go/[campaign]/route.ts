import { NextRequest, NextResponse } from 'next/server';

import { normalizeCampaignSlug } from '@/lib/campaigns';
import { getServerLanguage } from '@/lib/server-i18n';

interface CampaignRouteContext {
  params: Promise<{ campaign: string }>;
}

/**
 * Stable, privacy-first campaign entry point. The slug is allow-listed and
 * the destination is always an internal TCG activation route.
 */
export async function GET(request: NextRequest, { params }: CampaignRouteContext): Promise<NextResponse> {
  const { campaign } = await params;
  const normalizedCampaign = normalizeCampaignSlug(campaign);

  if (!normalizedCampaign) {
    return new NextResponse('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  }

  const language = await getServerLanguage();
  const destination = new URL(`/${language}/tcg/start`, request.url);
  destination.searchParams.set('source', 'campaign');
  destination.searchParams.set('campaign', normalizedCampaign);

  return NextResponse.redirect(destination, {
    status: 307,
    headers: { 'Cache-Control': 'no-store' },
  });
}
