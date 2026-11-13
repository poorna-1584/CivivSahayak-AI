import type { Request, Response, NextFunction } from 'express';
import { config } from './config.ts';

interface RateBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateBucket>();

export function aiRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - config.rateLimitWindowMs;

  const bucket = buckets.get(ip) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);

  if (bucket.timestamps.length >= config.rateLimitMaxAiRequests) {
    res.status(429).json({
      error: 'Too many AI requests. Please wait a moment before sending another query.',
    });
    return;
  }

  bucket.timestamps.push(now);
  buckets.set(ip, bucket);
  next();
}
