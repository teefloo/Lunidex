import { NextRequest } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { apiError, apiResponse, runPublicApi, readJsonObject } from '@/lib/public-api';
import { getTCGCardCached } from '@/lib/api/server-cache';
import { normalizeTCGCardLanguage } from '@primedex/core/lib/tcg-language';
import { getCardSnapshot, listCardHoldings, publicCardProjection, setCardHolding } from '@/lib/public-api-tcg';
import { publicApiRouteError, apiQueryError } from '@/lib/public-api-route';
import { normalizeTcgCardId } from '@/lib/tcg-owned-cards';

type RouteContext = { params: Promise<{ cardId: string }> };

async function getCard(request: NextRequest, routeContext: RouteContext): Promise<Response> {
  const { cardId: rawCardId } = await routeContext.params;
  return runPublicApi(request, '/api/v1/cards/:cardId', 'read', 'cards', async ({ sql, userId }) => {
    const cardId = normalizeTcgCardId(rawCardId);
    if (!cardId) {
      return apiQueryError('cardId is invalid.');
    }
    const requestedLanguage = request.nextUrl.searchParams.get('language');
    const language = requestedLanguage ? normalizeTCGCardLanguage(requestedLanguage) : null;
    if (requestedLanguage && !language) return apiQueryError('language is invalid.');
    const snapshot = await getCardSnapshot(sql, userId);
    const holdings = listCardHoldings(snapshot.state).filter((holding) => (
      holding.cardId.toLowerCase() === cardId && (!language || holding.language === language)
    ));
    if (holdings.length === 0) return apiError(404, 'NOT_FOUND', 'The card is not in this account collection.');
    const cardLanguage = language ?? holdings.find((holding) => holding.language)?.language ?? 'en';
    const card = await getTCGCardCached(cardId, cardLanguage);
    if (!card) return apiError(404, 'CARD_NOT_FOUND', 'The card metadata could not be found.');
    return apiResponse({ card: publicCardProjection(card), holdings });
  });
}

async function putCard(request: NextRequest, routeContext: RouteContext): Promise<Response> {
  const { cardId } = await routeContext.params;
  return runPublicApi(request, '/api/v1/cards/:cardId', 'write', undefined, async ({ sql, userId, keyId }) => {
    const body = await readJsonObject<Record<string, unknown>>(request, 4_096);
    if (!body) return apiQueryError('A JSON object is required.');
    try {
      const result = await setCardHolding(sql, userId, keyId, {
        cardId,
        language: body.language,
        variant: body.variant,
        quantity: body.quantity,
      });
      return apiResponse(result);
    } catch (error) {
      return publicApiRouteError(error);
    }
  });
}

export const GET = withObservedRouteHandler('/api/v1/cards/:cardId', 'api', getCard);
export const PUT = withObservedRouteHandler('/api/v1/cards/:cardId', 'api', putCard);
