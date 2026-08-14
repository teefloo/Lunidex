import { NextResponse } from 'next/server';

/**
 * Retained as a compatibility path for older clients. Owned-card state now
 * belongs to the authenticated /api/user-state snapshot; this legacy cookie
 * endpoint must not read, write, or silently import anonymous data.
 */
function legacyEndpointResponse(): NextResponse {
  return NextResponse.json(
    { error: 'This legacy endpoint is disabled. Sign in to use account-backed TCG state.' },
    { status: 410 },
  );
}

export function GET(): NextResponse {
  return legacyEndpointResponse();
}

export function POST(): NextResponse {
  return legacyEndpointResponse();
}

export function PATCH(): NextResponse {
  return legacyEndpointResponse();
}

export function DELETE(): NextResponse {
  return legacyEndpointResponse();
}
