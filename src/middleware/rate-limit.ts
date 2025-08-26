import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory stores for rate limiting
const ipRateLimits = new Map<string, RateLimitEntry>();
const phoneRateLimits = new Map<string, RateLimitEntry>();

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  const windowSize = 60 * 1000; // 1 minute

  for (const [key, entry] of ipRateLimits.entries()) {
    if (now - entry.windowStart > windowSize) {
      ipRateLimits.delete(key);
    }
  }

  for (const [key, entry] of phoneRateLimits.entries()) {
    if (now - entry.windowStart > windowSize) {
      phoneRateLimits.delete(key);
    }
  }
}, 60 * 1000);

function getClientIp(req: Request): string {
  // Check for forwarded IP (behind proxy)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (forwarded as string).split(',');
    return ips[0].trim();
  }
  // Fallback to socket address
  return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(
  store: Map<string, RateLimitEntry>,
  key: string,
  limit: number,
  windowMs: number = 60 * 1000
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    // New window
    store.set(key, {
      count: 1,
      windowStart: now,
    });
    return true;
  }

  // Within current window
  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

// Middleware for signup rate limiting
export function signupRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = getClientIp(req);
  
  if (!checkRateLimit(ipRateLimits, `signup:${ip}`, config.rateLimit.signupPerIpPerMinute)) {
    res.status(429).json({
      error: 'Too many signup attempts. Please try again later.',
    });
    return;
  }

  next();
}

// Middleware for login rate limiting
export function loginRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = getClientIp(req);
  
  if (!checkRateLimit(ipRateLimits, `login:${ip}`, config.rateLimit.loginPerIpPerMinute)) {
    res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
    });
    return;
  }

  next();
}

// Function to check phone-based rate limit (called from auth routes)
export function checkPhoneRateLimit(phoneE164: string): boolean {
  return checkRateLimit(
    phoneRateLimits,
    `login:${phoneE164}`,
    config.rateLimit.loginPerPhonePerMinute
  );
}