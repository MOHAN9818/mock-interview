// Security & Sanitization utilities for prompt injection defense and rate limiting

// Basic in-memory sliding window rate limiter for expensive AI endpoints
const requestCounts = new Map();

export const aiRateLimiter = (options = { windowMs: 60 * 1000, maxRequests: 20 }) => {
  return (req, res, next) => {
    const key = req.userId ? String(req.userId) : (req.ip || 'global');
    const now = Date.now();
    const windowStart = now - options.windowMs;

    const timestamps = requestCounts.get(key) || [];
    const recentTimestamps = timestamps.filter((t) => t > windowStart);

    if (recentTimestamps.length >= options.maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please wait a moment before trying again.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    recentTimestamps.push(now);
    requestCounts.set(key, recentTimestamps);

    // Periodic cleanup
    if (requestCounts.size > 2000) {
      for (const [k, v] of requestCounts.entries()) {
        const valid = v.filter((t) => t > windowStart);
        if (valid.length === 0) requestCounts.delete(k);
        else requestCounts.set(k, valid);
      }
    }

    next();
  };
};

/**
 * Sanitizes input text to defend against prompt injection patterns.
 * Strips dangerous instruction overrides and system prompt tampering tokens.
 */
export const sanitizeForPrompt = (text = '') => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/ignore\s+(all\s+)?(previous|prior)\s+instructions/gi, '[FILTERED_INSTRUCTION]')
    .replace(/disregard\s+(all\s+)?(previous|prior)\s+prompts/gi, '[FILTERED_INSTRUCTION]')
    .replace(/system:\s*you\s+are/gi, '[FILTERED_INSTRUCTION]')
    .replace(/```(?:json|markdown)?\s*\{[\s\S]*?"role"\s*:\s*"system"/gi, '[FILTERED_INSTRUCTION]')
    .trim();
};
