import bcrypt from "bcryptjs";
import type { User, UserRepository } from "./user.repository.js";

export class InMemoryUserRepository implements UserRepository {
  private users: User[] = [
    { id: "u1", email: "admin@example.com", passwordHash: bcrypt.hashSync("admin-pass", 10), role: "admin" },
    { id: "u2", email: "user@example.com",  passwordHash: bcrypt.hashSync("user-pass", 10),  role: "user" },
  ];

  async findByEmail(email: string) {
    return this.users.find((u) => u.email === email.toLowerCase());
  }
}
