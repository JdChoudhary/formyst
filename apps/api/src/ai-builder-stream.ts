import type { Request, Response } from "express";
import { z } from "zod";
import { auth, fromNodeHeaders } from "@repo/auth";
import { logger } from "@repo/logger";
import { formSchema } from "@repo/shared";
import { isServiceError } from "@repo/trpc/server";
import { aiBuilderService } from "@repo/trpc/server/services";

/**
 * Streaming AI form generation.
 *
 * The tRPC mutation is still the canonical contract; this endpoint exists so
 * the chat UI can render *real* progress while the model writes the schema
 * (AI SDK `streamText` → newline-delimited JSON → the browser), instead of a
 * timer pretending to stream.
 *
 * The response is `application/x-ndjson`, one JSON event per line:
 *   { "type": "progress", "text": "Designing question 3…" }
 *   { "type": "done", ...AIBuilderGenerateResult }
 *   { "type": "error", "message": "…" }
 *
 * It is mounted at `/api/ai-builder/stream`, which the web app reaches through
 * its existing `/api/*` rewrite — so the browser calls it same-origin and the
 * session cookie flows through untouched.
 */

const streamBodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(40),
  sessionId: z.string().uuid().optional(),
  currentSchema: formSchema.optional(),
});

export async function aiBuilderStreamHandler(req: Request, res: Response): Promise<void> {
  // Better Auth owns the session; reuse it rather than duplicating auth here.
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const parsed = streamBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body", issues: parsed.error.issues });
    return;
  }

  // From here on the status line is already sent, so failures are reported as
  // stream events rather than HTTP status codes.
  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  // Undoes proxy buffering (nginx) so chunks reach the browser as they happen.
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let closed = false;
  res.on("close", () => {
    closed = true;
  });

  const write = (event: Record<string, unknown>): void => {
    if (closed) return;
    res.write(`${JSON.stringify(event)}\n`);
  };

  try {
    const result = await aiBuilderService.generateSchema(
      {
        userId: session.user.id,
        role: String((session.user as { role?: string }).role ?? "user"),
        email: session.user.email,
        messages: parsed.data.messages,
        sessionId: parsed.data.sessionId,
        currentSchema: parsed.data.currentSchema ?? null,
        ip: req.ip ?? "unknown",
        userAgent: String(req.headers["user-agent"] ?? ""),
      },
      {
        onProgress: (message) => write({ type: "progress", text: message }),
      },
    );

    write({ type: "done", ...result });
  } catch (error) {
    const message = isServiceError(error)
      ? error.message
      : "Something went wrong while generating the form. Please try again.";
    if (!isServiceError(error)) {
      logger.error("AI builder stream failed", { err: error });
    }
    write({ type: "error", message, code: isServiceError(error) ? error.code : "INTERNAL" });
  } finally {
    res.end();
  }
}
