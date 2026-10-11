"use client";

import { useCallback } from "react";

import { authClient, useSession } from "~/lib/auth-client";

export interface UseAuthResult {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    [key: string]: unknown;
  } | null;
  loading: boolean;
  isPending: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const { data, isPending, refresh } = useSession();

  const signOut = useCallback(async () => {
    await authClient.signOut();
  }, []);

  const sessionUser = data?.user ?? null;

  return {
    user: sessionUser,
    loading: isPending,
    isPending,
    isAuthenticated: Boolean(sessionUser),
    signOut,
    refresh: refresh as () => Promise<void>,
  };
}
