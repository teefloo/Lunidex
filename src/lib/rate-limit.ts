import type { NextRequest } from 'next/server';

const WINDOW_MS = 60_000;

interface Entry { count: number; resetAt: number; }
const store = new Map<string, Entry>();

function evict(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

/**
 * Returns true if the request is within the allowed rate.
 * Note: per-process only — not shared across serverless instances.
 * Replace with an Upstash/Redis-backed solution for production-grade limiting.
 */
export function rateLimit(key: string, maxRequests: number): boolean {
  if (store.size > 10_000) evict();
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export function ipKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}
