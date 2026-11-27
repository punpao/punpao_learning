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

}