import type { ServerRouter } from "@repo/trpc/client";
import {
  createTRPCProxyClient,
  httpBatchStreamLink,
  httpLink,
} from "@repo/trpc/client";
import { headers } from "next/headers";

import { env } from "~/env.js";

interface CreateServerClientOpts {
  enableStreaming?: boolean;
}

/**
 * Server-side tRPC client factory.
 *
 * Unlike the browser client, it forwards the incoming request's `cookie`
 * header so protected procedures (e.g. the admin router) can resolve the
 * Better Auth session, and it disables Next's fetch cache so RSC pages always
 * read fresh data.
 */
function createServerClient(opts?: CreateServerClientOpts) {
  const link = opts?.enableStreaming ? httpBatchStreamLink : httpLink;
  return createTRPCProxyClient<ServerRouter>({
    links: [
      link({
        url: env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/trpc",
        async headers() {
          const headerStore = await headers();
          const cookie = headerStore.get("cookie");
          return cookie ? { cookie } : {};
        },
        fetch(url, options) {
          return fetch(url, { ...options, cache: "no-store" });
        },
      }),
    ],
  });
}

export const api = createServerClient();

export const apiStreaming = createServerClient({ enableStreaming: true });