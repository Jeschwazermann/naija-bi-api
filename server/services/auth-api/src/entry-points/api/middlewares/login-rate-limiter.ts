import rateLimit from 'express-rate-limit';

// ✅ Best Practice: rate-limit login specifically (not the whole API) —
// register is naturally self-limiting (unique email), login is the brute-force target.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too-many-attempts', message: 'Too many login attempts — try again later' },
});
