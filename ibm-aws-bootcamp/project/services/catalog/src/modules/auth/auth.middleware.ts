// Auth middleware.
// - requireAuth: WHO are you? (authentication)  No/invalid token → 401.
// - requireRole: WHAT may you do? (authorization) Valid token, wrong role → 403.
// Use them in this order on a route: requireAuth(auth), requireRole("admin").
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { sendProblem } from "../../shared/http/problem.js";
import type { AuthService } from "./auth.service.js";
import type { Role } from "./user.repository.js";

// What requireAuth stores in res.locals.user for the middleware after it.
type AuthUser = { id: string; role: Role };

function sendUnauthorized(req: Request, res: Response): void {
  // RFC 6750: a 401 for a Bearer-protected resource should say which scheme it wants.
  res.setHeader("WWW-Authenticate", "Bearer");
  sendProblem(req, res, 401, "Missing or invalid access token");
}

// Expects the header:  Authorization: Bearer <token>
export function requireAuth(auth: AuthService): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const [scheme, token] = (req.headers.authorization ?? "").split(" ");
    // The scheme name is case-insensitive in HTTP ("Bearer", "bearer" are the same).
    const user = scheme?.toLowerCase() === "bearer" && token ? auth.verify(token) : null;

    if (!user) {
      sendUnauthorized(req, res);
      return;
    }

    // Keep who is calling, for later checks (e.g. requireRole below).
    res.locals.user = user satisfies AuthUser;
    next();
  };
}

// Allow the request only if the caller's role is one of `roles`.
export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user as AuthUser | undefined;

    // No user means requireAuth did not run before this (a wiring mistake).
    // Fail closed: treat it as "not logged in", never let it through.
    if (!user) {
      sendUnauthorized(req, res);
      return;
    }

    if (!roles.includes(user.role)) {
      sendProblem(req, res, 403, "You do not have permission to perform this action");
      return;
    }

    next();
  };
}
