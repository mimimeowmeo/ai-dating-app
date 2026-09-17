import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { ENV, type Env } from "../../config/env.js";

export const PG_POOL = Symbol("PG_POOL");
export const DB = Symbol("DB");

export type Database = NodePgDatabase;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ENV],
      useFactory: (env: Env) => new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 }),
    },
    {
      provide: DB,
      inject: [PG_POOL],
      useFactory: (pool: pg.Pool): Database => drizzle({ client: pool }),
    },
  ],
  exports: [PG_POOL, DB],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
