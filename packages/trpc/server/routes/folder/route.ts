import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { folderService } from "../../services";
import {
  folderOutputSchema,
  folderNodeSchema,
  createFolderInputSchema,
  renameFolderInputSchema,
  moveFolderInputSchema,
  folderIdInputSchema,
  getChildrenInputSchema,
  reorderFoldersInputSchema,
} from "./model";

const TAGS = ["Folder"];
const getPath = generatePath("/folder");

function requireUser(ctx: { user?: { id: string } }): asserts ctx is { user: { id: string } } {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
}

export const folderRouter = router({
  getAll: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(z.undefined())
    .output(z.array(folderNodeSchema))
    .query(async ({ ctx }) => {
      requireUser(ctx);
      return (await folderService.getTree(ctx.user.id)) as any;
    }),

  getChildren: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/children"), tags: TAGS } })
    .input(getChildrenInputSchema.optional())
    .output(z.array(folderOutputSchema))
    .query(async ({ input, ctx }) => {
      requireUser(ctx);
      const parentId = input?.parentId ?? null;
      return (await folderService.getChildren(ctx.user.id, parentId)) as any;
    }),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createFolderInputSchema)
    .output(folderOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      // The service validates the parent (existence, ownership, archived state).
      return (await folderService.create(ctx.user.id, {
        ...input,
        parentId: input.parentId ?? null,
        createdBy: ctx.user.id,
      })) as any;
    }),

  rename: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/{id}"), tags: TAGS } })
    .input(renameFolderInputSchema)
    .output(folderOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      return (await folderService.rename(ctx.user.id, input.id, input.name)) as any;
    }),

  move: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/{id}/move"), tags: TAGS } })
    .input(moveFolderInputSchema)
    .output(folderOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      return (await folderService.move(ctx.user.id, input.id, input.newParentId)) as any;
    }),

  archive: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{id}/archive"), tags: TAGS } })
    .input(folderIdInputSchema)
    .output(folderOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      return (await folderService.archive(ctx.user.id, input.id)) as any;
    }),

  restore: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{id}/restore"), tags: TAGS } })
    .input(folderIdInputSchema)
    .output(folderOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      return (await folderService.restore(ctx.user.id, input.id)) as any;
    }),

  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/{id}"), tags: TAGS } })
    .input(folderIdInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const deleted = await folderService.delete(ctx.user.id, input.id);
      if (deleted.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }
      return { success: true };
    }),

  reorder: protectedProcedure
    .meta({ openapi: { method: "PUT", path: getPath("/reorder"), tags: TAGS } })
    .input(reorderFoldersInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      await folderService.reorder(ctx.user.id, input.orderedFolderIds);
      return { success: true };
    }),
});
