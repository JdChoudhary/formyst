"use client";

import { useMemo } from "react";

export interface PremiumStatus {
  hasPremium: boolean;
  checkingPremium: boolean;
}

interface PremiumUser {
  email?: string | null;
  role?: string | null;
  [key: string]: unknown;
}

const PREMIUM_EMAILS = (process.env.NEXT_PUBLIC_PREMIUM_EMAILS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

/**
 * Resolve whether a signed-in user may use premium surfaces (the AI builder).
 *
 * This deployment has no billing provider wired up, so by default every
 * signed-in user is treated as entitled — otherwise the feature would be
 * unreachable. Set `NEXT_PUBLIC_PREMIUM_EMAILS` to restrict access to an
 * allow-list, and admins are always entitled regardless.
 */
export function usePremiumStatus(user: PremiumUser | null | undefined): PremiumStatus {
  return useMemo(() => {
    if (!user) {
      return { hasPremium: false, checkingPremium: false };
    }

    const role = (user.role as string | null | undefined) ?? null;
    const email = (user.email ?? "").toLowerCase();

    const hasPremium =
      role === "admin" || PREMIUM_EMAILS.length === 0 || PREMIUM_EMAILS.includes(email);

    return { hasPremium, checkingPremium: false };
  }, [user]);
}
