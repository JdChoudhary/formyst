import { z } from "zod";

/** `{ id }` — target user. */
export const adminUserIdInputSchema = z.object({ id: z.string().min(1) });

/** `{ userId }` — whose forms / response count to look up. */
export const adminTargetUserInputSchema = z.object({ userId: z.string().min(1) });

/** `{ formId }` — target form. */
export const adminFormIdInputSchema = z.object({ formId: z.string().min(1) });
