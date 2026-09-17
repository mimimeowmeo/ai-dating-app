import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { type Database, DB } from "../../infra/db/db.module.js";
import { type UserRow, users } from "./users.schema.js";

const UNIQUE_VIOLATION = "23505";

function isUsernameTaken(error: unknown): boolean {
  if (!(error instanceof DrizzleQueryError)) {
    return false;
  }
  const cause = error.cause as { code?: unknown; constraint?: unknown } | undefined;
  return cause?.code === UNIQUE_VIOLATION && cause.constraint === "users_username_key";
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findByUsername(username: string): Promise<UserRow | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0];
  }

  async findById(id: string): Promise<UserRow | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async createIfUsernameFree(username: string, passwordHash: string): Promise<UserRow | null> {
    try {
      const rows = await this.db.insert(users).values({ username, passwordHash }).returning();
      return rows[0] ?? null;
    } catch (error: unknown) {
      if (isUsernameTaken(error)) {
        return null;
      }
      throw error;
    }
  }
}
