import { Router } from "express";
import { sendProblem } from "../../shared/http/problem.js";
import { loginSchema } from "./auth.schema.js";
import type { AuthService } from "./auth.service.js";

export function createAuthRouter(auth: AuthService) {
  const router = Router();

  router.post("/login", async (req, res) => {
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