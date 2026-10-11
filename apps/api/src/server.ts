import express from "express";
import { logger } from "@repo/logger";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext } from "@repo/trpc/server";
import { auth, toNodeHandler } from "@repo/auth";

import { env, allowedOrigins } from "./env";
import { aiBuilderStreamHandler } from "./ai-builder-stream";
import { errorHandler, notFoundHandler, rateLimit, securityHeaders } from "./middleware";

export const app = express();

// Do not advertise the framework.
app.disable("x-powered-by");

// `TRUST_PROXY` must be set behind a load balancer so `req.ip` — and therefore
// rate limiting — sees the real client instead of the proxy's address.
app.set("trust proxy", env.TRUST_PROXY);

const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "formyst OpenAPI",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

/**
 * `CORS_ORIGIN` is already parsed into a trimmed, trailing-slash-free array by
 * `env.ts`. Splitting it again here is what used to crash the server — the
 * value is a `string[]`, not a string.
 */
const allowedOriginSet = new Set(allowedOrigins);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Same-origin/non-browser requests (no Origin header) are always allowed.
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, allowedOriginSet.has(origin.replace(/\/+$/, "")));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 600,
};

app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(rateLimit);
app.use(cookieParser());

// Better Auth reads the raw request stream, so it must be mounted *before* the
// JSON body parser.
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json({ limit: env.BODY_LIMIT }));

app.get("/", (_req, res) => {
  return res.json({ message: "formyst is up and running..." });
});

app.get("/health", (_req, res) => {
  return res.json({ message: "formyst server is healthy", healthy: true });
});

if (env.ENABLE_API_DOCS) {
  logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
  app.get("/openapi.json", (_req, res) => {
    return res.json(openApiDocument);
  });

  logger.debug(`docs: ${env.BASE_URL}/docs`);
  app.use("/docs", apiReference({ url: "/openapi.json" }));
}

// Streaming AI generation must be registered before the `/api` OpenAPI
// middleware, which would otherwise swallow the path.
app.post("/api/ai-builder/stream", (req, res, next) => {
  aiBuilderStreamHandler(req, res).catch(next);
});

app.use(
  "/api",
  createOpenApiExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

// Must come last: unmatched routes get JSON 404s and every thrown error is
// funnelled through one handler.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
