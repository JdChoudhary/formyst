import { createAuthClient } from "better-auth/client";
import { adminClient } from "better-auth/client/plugins";
import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/trpc", "") || "http://localhost:8000";

export const authClient = createAuthClient({
  baseURL: API_BASE,
  plugins: [adminClient()],
});

export const { signIn, signOut, signUp } = authClient;

type SessionData = NonNullable<
  Awaited<ReturnType<typeof authClient.getSession>>["data"]
>;

export function useSession() {
  const [data, setData] = useState<SessionData | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsPending(true);
    try {
      const result = await authClient.getSession();
      setData(result.data as SessionData | null);
      setError(null);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err : new Error("Failed to fetch session"));
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => {
    // Defer the initial fetch out of the synchronous effect body to avoid
    // cascading renders (initial `isPending` is already `true`).
    const id = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  return { data, isPending, error, refresh };
}
