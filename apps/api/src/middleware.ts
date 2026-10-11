import type { NextFunction, Request, Response } from "express";
import { logger } from "@repo/logger";

import { env, isProduction, rateLimitEnabled } from "./env";

/**
 * Baseline security headers.
 *
 * The API serves JSON (and the Scalar docs UI), so this stays deliberately
 * conservative: no Content-Security-Policy, because a strict default would
 * break the Scalar reference without a per-route override, and the JSON
 * responses do not execute script anyway.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
}

/* -------------------------------------------------------------------------- */
/* Rate limiting                                                              */
/* -------------------------------------------------------------------------- */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window limiter kept in process memory.
 *
 * The API runs as a single process behind a load balancer, so a shared store
 * (Redis) is not required. Buckets are keyed by client IP and pruned lazily so
 * a stream of unique IPs cannot grow the map without bound.
 */
const buckets = new Map<string, RateLimitBucket>();
const MAX_TRACKED_CLIENTS = 50_000;

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function clientKey(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  if (!rateLimitEnabled) {
    next();
    return;
  }

  const now = Date.now();
  const key = clientKey(req);

  if (buckets.size > MAX_TRACKED_CLIENTS) pruneExpired(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + env.RATE_LIMIT_WINDOW_MS };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, env.RATE_LIMIT_MAX - bucket.count);
  const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

  res.setHeader("RateLimit-Limit", String(env.RATE_LIMIT_MAX));
  res.setHeader("RateLimit-Remaining", String(remaining));
  res.setHeader("RateLimit-Reset", String(resetSeconds));

  if (bucket.count > env.RATE_LIMIT_MAX) {
    res.setHeader("Retry-After", String(resetSeconds));
    res.status(429).json({ message: "Too many requests, please try again later" });
    return;
  }

  next();
}

/* -------------------------------------------------------------------------- */
/* Terminal handlers                                                          */
/* -------------------------------------------------------------------------- */

/** Answers unmatched routes with JSON instead of Express' HTML default. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: "Not found" });
}

/**
 * Final error handler.
 *
 * Must keep all four parameters so Express treats it as an error middleware.
 * Malformed JSON is reported as a 400 rather than a 500, and anything else is
 * logged with its stack and reduced to a generic message so internal details
 * never reach the client.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ message: "Invalid JSON body" });
    return;
  }

  logger.error(`Unhandled error on ${req.method} ${req.path}`, { err: error });
  res.status(500).json({ message: "Internal server error" });
}
