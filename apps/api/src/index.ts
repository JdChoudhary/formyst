import http from "node:http";
import { logger } from "@repo/logger";
import { closeDatabase, setPoolErrorHandler } from "@repo/database";

import { app as expressApplication } from "./server";
import { env } from "./env";

// Idle-client / connection errors surface on the pg pool, not on a query. Route
// them through winston so they are logged instead of killing the process.
setPoolErrorHandler((error) => {
  logger.error("Database pool error", { err: error });
});

async function init() {
  const server = http.createServer(expressApplication);
  const PORT: number = env.PORT;

  server.on("error", (error) => {
    logger.error("HTTP server error", { err: error });
    process.exit(1);
  });

  server.listen(PORT, () => {
    logger.info(`http server is running on PORT ${PORT}`);
  });

  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down gracefully`);

    // Stop accepting new connections and let in-flight requests finish, but
    // never hang forever waiting for a stuck one.
    const forceExit = setTimeout(() => {
      logger.error(`Shutdown exceeded ${env.SHUTDOWN_TIMEOUT_MS}ms, forcing exit`);
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(async (error) => {
      clearTimeout(forceExit);
      if (error) logger.error("Error closing HTTP server", { err: error });

      try {
        await closeDatabase();
      } catch (dbError) {
        logger.error("Error closing database pool", { err: dbError });
      }

      process.exit(error ? 1 : 0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

init().catch((err) => {
  logger.error("Error creating http server", { err });
  process.exit(1);
});
