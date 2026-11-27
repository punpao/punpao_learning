// Send an error in the RFC 9457 "problem details" format.
// Every error from this service has the same shape, so clients parse it one way.
import { STATUS_CODES } from "node:http";
import type { Request, Response } from "express";

export function sendProblem(
  req: Request,
  res: Response,
  status: number,
  detail: string,
  extra: Record<string, unknown> = {}, // RFC 9457 allows extra fields ("extension members")
): void {
  res
    .status(status)
    .type("application/problem+json") // must be set BEFORE .json(), or .json() sets application/json
    .json({
      type: "about:blank",
      title: STATUS_CODES[status] ?? "Error", // 404 → "Not Found", 500 → "Internal Server Error"
      status,
      detail,
      instance: req.originalUrl,
      ...extra,
    });
}
