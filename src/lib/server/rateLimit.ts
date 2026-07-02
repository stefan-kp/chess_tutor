/**
 * Lightweight in-memory rate limiting and concurrency control for API routes.
 *
 * NOTE: state is per-process. Behind multiple instances / serverless fan-out
 * this is a best-effort guard, not a global quota. For hard multi-instance
 * limits put a shared limiter (e.g. Redis) or an edge/WAF rule in front.
 */
import { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Best-effort client identifier from proxy headers, falling back to a constant. */
export function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Fixed-window rate limiter. Returns whether the request is allowed plus the
 * seconds until the window resets (for a Retry-After header).
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

// Periodically drop expired buckets so the map cannot grow unbounded.
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(key);
    }
  }, 60_000);
  // Do not keep the event loop alive for cleanup alone.
  (timer as unknown as { unref?: () => void }).unref?.();
}

/**
 * Simple counting semaphore to cap concurrent expensive operations
 * (e.g. Stockfish worker spawns) within a single process.
 */
export class Semaphore {
  private available: number;
  private waiters: Array<() => void> = [];

  constructor(private readonly max: number) {
    this.available = max;
  }

  get activeCount(): number {
    return this.max - this.available;
  }

  tryAcquire(): boolean {
    if (this.available > 0) {
      this.available -= 1;
      return true;
    }
    return false;
  }

  release(): void {
    const next = this.waiters.shift();
    if (next) {
      next();
      return;
    }
    if (this.available < this.max) this.available += 1;
  }
}
