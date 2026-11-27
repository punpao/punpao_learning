import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { sendProblem } from "../../shared/http/problem.js";
import { loginSchema } from "./auth.schema.js";
import type { AuthService } from "./auth.service.js";

export type LoginRateLimit = { windowMs: number; limit: number };

// Default: 5 login attempts per 15 minutes per client IP. This slows down
// password guessing ("brute force") and trying leaked passwords on many emails.
export const DEFAULT_LOGIN_RATE_LIMIT: LoginRateLimit = { windowMs: 15 * 60 * 1000, limit: 5 };

export function createAuthRouter(
  auth: AuthService,
  loginRateLimit: LoginRateLimit = DEFAULT_LOGIN_RATE_LIMIT,
) {
  const router = Router();

  // Made inside this function, so every app (and every test) gets its own counter.
  // The counter lives in memory: with 2+ containers each one counts on its own,
  // so the real limit is 5 x number of tasks. A shared store (e.g. Redis) fixes that.
  const loginLimiter = rateLimit({
    windowMs: loginRateLimit.windowMs,
    limit: loginRateLimit.limit,
    standardHeaders: "draft-8", // RateLimit-Policy + RateLimit headers (IETF draft 8)
    legacyHeaders: false, // no old X-RateLimit-* headers
    // Counts by req.ip. Behind the ALB that is the real client IP only because
    // app.ts sets "trust proxy" (otherwise every client would share the ALB's IP).
    handler: (req, res) => {
      sendProblem(req, res, 429, "Too many login attempts, try again later");
    },
  });

  router.post("/login", loginLimiter, async (req, res) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      sendProblem(req, res, 400, "email and password are required");
      return;
    }

    const token = await auth.login(result.data.email, result.data.password);
    if (!token) {
      sendProblem(req, res, 401, "Invalid email or password");
      return;
    }

    res.json(token);
  });

  return router;
}
