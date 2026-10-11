import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { aiBuilderService } from "../../services";
import {
  generateSchemaInputSchema,
  generateSchemaOutputSchema,
  getChatHistoryInputSchema,
  getChatHistoryOutputSchema,
  listSessionsOutputSchema,
  saveMessageInputSchema,
  savedMessageOutputSchema,
  sessionIdInputSchema,
  deleteSessionOutputSchema,
  healthOutputSchema,
} from "./model";

const TAGS = ["AI Builder"];
const getPath = generatePath("/ai-builder");

type CtxUser = { id: string; role: string; email: string };

function requireUser(ctx: { user?: CtxUser }): asserts ctx is { user: CtxUser } {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
}

/** First hop of `x-forwarded-for`, falling back to the socket address. */
function clientIp(ctx: {
  req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string } };
}): string {
  const forwarded = ctx.req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof value === "string" && value.trim()) {
    return value.split(",")[0]!.trim();
  }
  return ctx.req.socket?.remoteAddress ?? "unknown";
}

export const aiBuilderRouter = router({
  /**
   * Generate (or refine) a form schema from a conversation. Returns the
   * canonical schema plus the assistant turn; the schema is validated against
   * `@repo/shared`'s `formSchema` before it is ever returned. The returned
   * `sessionId` is the conversation to pass back on the next turn.
   */
  generateSchema: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/generate"), tags: TAGS } })
    .input(generateSchemaInputSchema)
    .output(generateSchemaOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      aiBuilderService.assertEntitled(ctx.user);
      return aiBuilderService.generateSchema({
        userId: ctx.user.id,
        role: ctx.user.role,
        email: ctx.user.email,
        messages: input.messages,
        sessionId: input.sessionId,
        currentSchema: input.currentSchema ?? null,
        ip: clientIp(ctx),
        userAgent: String(ctx.req.headers["user-agent"] ?? ""),
      });
    }),

  /** Full persisted history for a conversation, oldest message first. */
  getChatHistory: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/chat"), tags: TAGS } })
    .input(getChatHistoryInputSchema)
    .output(getChatHistoryOutputSchema)
    .query(async ({ input, ctx }) => {
      requireUser(ctx);
      aiBuilderService.assertEntitled(ctx.user);
      const messages = await aiBuilderService.getChatHistory(ctx.user.id, input.sessionId);
      return { sessionId: input.sessionId, messages, count: messages.length };
    }),

  /** Append a single message to a conversation (client-driven autosave). */
  saveMessage: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/chat"), tags: TAGS } })
    .input(saveMessageInputSchema)
    .output(savedMessageOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      aiBuilderService.assertEntitled(ctx.user);
      return aiBuilderService.saveMessage(
        ctx.user.id,
        input.sessionId,
        input.role,
        input.content,
        input.metadata ?? {},
      );
    }),

  /** The caller's conversations, most recently active first. */
  listSessions: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/sessions"), tags: TAGS } })
    .output(listSessionsOutputSchema)
    .query(async ({ ctx }) => {
      requireUser(ctx);
      aiBuilderService.assertEntitled(ctx.user);
      const sessions = await aiBuilderService.listSessions(ctx.user.id);
      return { sessions, count: sessions.length };
    }),

  /** Delete one of the caller's conversations (and its messages). */
  deleteSession: protectedProcedure
    .meta({
      openapi: { method: "DELETE", path: getPath("/sessions/{sessionId}"), tags: TAGS },
    })
    .input(sessionIdInputSchema)
    .output(deleteSessionOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      aiBuilderService.assertEntitled(ctx.user);
      const success = await aiBuilderService.deleteSession(ctx.user.id, input.sessionId);
      if (!success) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Chat session not found" });
      }
      return { success: true };
    }),

  /** Liveness/config probe for the AI provider. */
  health: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/health"), tags: TAGS } })
    .output(healthOutputSchema)
    .query(async () => {
      return aiBuilderService.health();
    }),
});
