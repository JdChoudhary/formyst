import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request as ExpressRequest } from "express";

interface TRPCCtxUser {
  id: string;
  role: string;
  email: string;
  name: string;
  impersonatedBy: string | null | undefined;
}

export interface TRPCContext {
  req: ExpressRequest;
  user?: TRPCCtxUser;
}

export async function createContext({ req }: CreateExpressContextOptions): Promise<TRPCContext> {
  const ctx: TRPCContext = {
    req,
  };
  return ctx;
}
export type Context = Awaited<ReturnType<typeof createContext>>;
