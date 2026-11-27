export type Role = "admin" | "user";
export type User = { id: string; email: string; passwordHash: string; role: Role };

export interface UserRepository {
  findByEmail(email: string): Promise<User | undefined>;
}
