import { Pool, type PoolClient } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./env";
import * as schema from "./schema";

/**
 * The single shared Drizzle client for the platform.
 *
 * `import "dotenv/config"` used to live here, which meant every consumer of
 * `@repo/database` silently loaded a `.env` from whatever the process CWD
 * happened to be. Loading environment variables is the job of the *entry
 * point* (`drizzle.config.ts`, the API server), so it now lives there.
 */

/**
 * Idle-client errors (a database restart, a dropped TCP connection) are emitted
 * on the pool itself, not on the query that triggered them. With no listener,
 * Node turns that into an unhandled `error` event and kills the process — so a
 * pool error sink is mandatory. It is pluggable so the HTTP layer can route
 * these into winston without the data layer depending on a logger.
 */
export type PoolErrorHandler = (error: Error) => void;

let handlePoolError: PoolErrorHandler = (error) => {
  console.error("[database] idle client error:", error.message);
};

/** Route pool-level errors into the application logger. */
export function setPoolErrorHandler(handler: PoolErrorHandler): void {
  handlePoolError = handler;
}

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  // Fail fast instead of letting a request hang when the database is unreachable.
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (error) => {
  handlePoolError(error);
});

export const db = drizzle(pool, { schema });

/** Close the pool so the process can exit. Safe to call more than once. */
export async function closeDatabase(): Promise<void> {
  await pool.end();
}

/** Run `fn` inside a transaction, typed for use in service helpers. */
export type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type { PoolClient };

// Re-exported so callers need a single import surface for the query builder.
export * from "drizzle-orm";
export * from "./schema";
export default db;
