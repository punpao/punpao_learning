// Central error handler. Express knows it is an error handler because it has
// 4 parameters (err first). Keep all 4, even if one is unused.
// Must be registered LAST, after notFound.
import type { NextFunction, Request, Response } from "express";
import { sendProblem } from "../http/problem.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // If we already started sending the response, we can't send a new one.
  // Hand it to Express's default handler, which closes the connection.
  if (res.headersSent) {
    next(err);
    return;
  }

  // Some errors carry their own 4xx status, e.g. express.json() sets 400
  // for broken JSON. That is the client's fault, so keep the status.
  const status = (err as { status?: number } | null)?.status;
  if (status && status >= 400 && status < 500) {
    sendProblem(req, res, status, "The request could not be processed");
    return;
  }

  // Anything else is our bug: full details (with stack) in the server log only.
  // req.log is the pino-http child logger, so this line carries the request id.
  req.log.error({ err }, "unhandled error");
  sendProblem(req, res, 500, "Something went wrong on our side");
}
