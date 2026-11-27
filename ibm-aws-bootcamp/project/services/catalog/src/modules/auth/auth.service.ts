import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Role, UserRepository } from "./user.repository.js";

export type TokenPayload = { sub: string; role: Role };
export const TOKEN_TTL_SECONDS = 15 * 60;

export class AuthService {

  constructor(private users: UserRepository, private jwtSecret: string) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) return null;

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;

    const accessToken = jwt.sign({ role: user.role }, this.jwtSecret, {
      subject: user.id,
      expiresIn: TOKEN_TTL_SECONDS,
      algorithm: "HS256",
    });
    
    return { accessToken, tokenType: "Bearer" as const, expiresIn: TOKEN_TTL_SECONDS };
  }

  // Check a token: right signature, not expired, signed with HS256 only.
  // Pinning algorithms stops "alg confusion" attacks (e.g. a token with alg "none").
  // Any problem (bad signature, expired, malformed, wrong shape) → null.
  verify(token: string): { id: string; role: Role } | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret, { algorithms: ["HS256"] });
      // A valid signature only proves WE signed it; still check the shape we expect.
      if (
        typeof payload !== "object" ||
        typeof payload.sub !== "string" ||
        (payload.role !== "admin" && payload.role !== "user")
      ) {
        return null;
      }
      return { id: payload.sub, role: payload.role };
    } catch {
      return null;
    }
  }

}