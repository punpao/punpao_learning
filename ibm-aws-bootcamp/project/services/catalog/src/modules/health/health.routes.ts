// GET /health: a simple "I'm alive" check (load balancers and monitors call this).
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
