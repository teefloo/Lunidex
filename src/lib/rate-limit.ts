import type { NextRequest } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_ENTRIES = 10_000;
const MAX_KEY_LENGTH = 256;

interface Entry { count: number; resetAt: number; }
const store = new Map<string, Entry>();

/**
 * Keep attacker-controlled fingerprints from retaining arbitrarily large
 * strings in the process-local map. The short FNV-1a digest is only used for
 * oversized keys; normal application keys (for example UUIDs) stay readable.
 */
function compactKey(key: string): string {
  if (key.length <= MAX_KEY_LENGTH) return key;

  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `hash:${(hash >>> 0).toString(16)}:${key.length}`;
}

function evict(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

/**
 * Returns true if the request is within the allowed rate.
 * Note: per-process only — not shared across serverless instances.
 * Replace with an Upstash/Redis-backed solution for production-grade limiting.
 */
export function rateLimit(key: string, maxRequests: number): boolean {
  if (!Number.isFinite(maxRequests) || maxRequests < 1) return false;

  const limit = Math.floor(maxRequests);
  evict();
  const now = Date.now();
  const boundedKey = compactKey(key);
  const entry = store.get(boundedKey);
  if (!entry || now >= entry.resetAt) {
    // A process-local limiter cannot provide distributed guarantees, but it
    // should still have a hard memory bound when a caller rotates fingerprints.
    if (!entry && store.size >= MAX_ENTRIES) {
      // Map iteration order gives us an O(1) oldest-insertion eviction. The
      // regular `evict` pass above already removes expired entries first.
      const oldestKey = store.keys().next().value as string | undefined;
      if (oldestKey) store.delete(oldestKey);
    }
    store.set(boundedKey, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function getRateLimitEntryCount(): number {
  return store.size;
}

export function ipKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',', 1)[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return compactKey(forwarded || realIp || 'unknown');
}
