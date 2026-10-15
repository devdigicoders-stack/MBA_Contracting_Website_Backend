/**
 * In-memory sliding-window rate limiter for enquiry submissions.
 * Restricts excessive POST requests per IP address without requiring extra dependencies.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 5; // max 5 enquiries per IP per 15-minute window

const ipRequestMap = new Map();

// Periodic cleanup of stale IP records every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestMap.entries()) {
    if (now - record.startTime > WINDOW_MS) {
      ipRequestMap.delete(ip);
    }
  }
}, 10 * 60 * 1000).unref();

export function enquiryRateLimiter(req, res, next) {
  // Extract client IP address reliably (behind proxies or direct)
  const clientIp = 
    req.headers['x-forwarded-for']?.split(',')[0].trim() || 
    req.socket.remoteAddress || 
    'unknown-ip';

  const now = Date.now();
  const clientRecord = ipRequestMap.get(clientIp);

  if (!clientRecord) {
    ipRequestMap.set(clientIp, { count: 1, startTime: now });
    return next();
  }

  // If window expired, reset
  if (now - clientRecord.startTime > WINDOW_MS) {
    ipRequestMap.set(clientIp, { count: 1, startTime: now });
    return next();
  }

  // Check request limit
  if (clientRecord.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - clientRecord.startTime)) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds);

    return res.status(429).json({
      success: false,
      error: 'Too many enquiry submissions from this connection. Please wait before attempting again.',
      retryAfterSeconds
    });
  }

  clientRecord.count += 1;
  next();
}
