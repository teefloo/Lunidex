import type { NextRequest } from 'next/server';

/** Safely parse a JSON request body. Returns null on invalid JSON or non-object payloads. */
export async function readJsonBody<T>(request: NextRequest): Promise<T | null> {
  try {
    const payload = await request.json();
    return payload && typeof payload === 'object' ? (payload as T) : null;
  } catch {
    return null;
  }
}
