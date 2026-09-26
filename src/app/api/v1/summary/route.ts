import { NextRequest } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { apiResponse, runPublicApi } from '@/lib/public-api';
import { getCardSnapshot, listCardHoldings } from '@/lib/public-api-tcg';
import { getSealedCurrentPortfolio } from '@/lib/tcg-sealed-server';

async function getSummary(request: NextRequest): Promise<Response> {
  return runPublicApi(request, '/api/v1/summary', 'read', 'sealed', async ({ sql, userId }) => {
    const [profileResult, cardSnapshot, sealed] = await Promise.all([
      sql`
        select public_handle, caught_count, quiz_best_score, created_at::text, member_since::text
        from public.profiles where id = ${userId}::uuid limit 1
      `,
      getCardSnapshot(sql, userId),
      getSealedCurrentPortfolio(sql, userId, new Date().toISOString().slice(0, 10)),
    ]);
    const profileRows = profileResult as unknown as Array<{
      public_handle: string | null;
      caught_count: number;
      quiz_best_score: number;
      created_at: string;
      member_since: string | null;
    }>;
    const profile = profileRows[0];
    const holdings = listCardHoldings(cardSnapshot.state);
    const sealedTotals = sealed.summary.totals;
    return apiResponse({
      account: {
        id: userId,
        handle: profile?.public_handle ?? null,
        memberSince: profile?.member_since ?? profile?.created_at ?? null,
      },
      statistics: {
        pokemonCaught: Number(profile?.caught_count ?? 0),
        quizBestScore: Number(profile?.quiz_best_score ?? 0),
        cards: {
          physical: holdings.reduce((sum, holding) => sum + holding.quantity, 0),
          distinct: new Set(holdings.map((holding) => holding.cardId.toLowerCase())).size,
        },
        sealed: {
          units: sealedTotals.units,
          distinct: sealedTotals.distinct,
          costCents: sealedTotals.costCents,
          valueCents: sealedTotals.valueCents,
          missingPrices: sealedTotals.missingPrices,
          currency: 'EUR',
        },
      },
    }, 200, { sealedRevision: sealed.revision, priceRevision: sealed.priceRevision });
  });
}

export const GET = withObservedRouteHandler('/api/v1/summary', 'api', getSummary);
