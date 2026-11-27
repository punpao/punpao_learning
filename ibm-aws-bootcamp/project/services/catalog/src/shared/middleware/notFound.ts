// 404 handler: runs only when no route before it sent a response.
// Must be registered AFTER all routers.
import type { Request, Response } from "express";
import { sendProblem } from "../http/problem.js";

export function notFound(req: Request, res: Response): void {
  sendProblem(req, res, 404, `No route for ${req.method} ${req.originalUrl}`);
}
