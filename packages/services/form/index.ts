import db, { and, desc, eq, ilike, isNull, sql } from "@repo/database";
import { form, formVersion, theme as themeTable } from "@repo/database";
import { normalizeFormSchemaSafe, type Theme } from "@repo/shared";
import { badRequestError, internalError, withUniqueConstraint } from "../errors";
import { createDefaultFormSchema, ensureDefaultFormSettings } from "./form-defaults";
import type { FormSchema } from "./lib/types";
import {
  createFormInputSchema,
  updateFormInputSchema,
  saveVersionInputSchema,
  type CreateFormInput,
  type UpdateFormInput,
  type SaveVersionInput,
} from "./model";

type FormRow = typeof form.$inferSelect;
type FormVersionRow = typeof formVersion.$inferSelect;
type FormStatus = "draft" | "published";

export interface FormDTO extends FormRow {
  status: FormStatus;
}

/** The slug index is global, so a collision is a CONFLICT, not a server bug. */
const FORM_SLUG_CONFLICT = {
  message: "A form with this URL already exists",
  reason: "form_slug_taken",
} as const;

/** Random hex string used to build API keys. */
function randomHex(bytes: number): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buffer)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export interface FormDetailDTO extends FormDTO {
  schema: FormSchema | null;
  version: FormVersionRow | null;
}

export class FormService {
  async create(userId: string, createdBy: string, data: CreateFormInput) {
    const slug = await this.generateUniqueSlug(userId, data.title);

    const [created] = await withUniqueConstraint(
      () =>
        db
          .insert(form)
          .values({
            userId,
            folderId: data.folderId ?? null,
            createdBy,
            title: data.title,
            description: data.description ?? null,
            slug,
            revision: 0,
            themeId: data.themeId ?? null,
            themeUrl: data.themeUrl ?? null,
          })
          .returning(),
      FORM_SLUG_CONFLICT,
    );
    if (!created) return null;

    if (data.schema) {
      await this.saveDraft(created.id, userId, createdBy, data.schema);
    }

    return this.getById(created.id, userId);
  }

  async getAll(
    userId: string,
    filters?: { folderId?: string | null; search?: string; publishedOnly?: boolean },
  ) {
    const conditions = [eq(form.userId, userId)];
    if (filters?.folderId !== undefined) {
      if (filters.folderId === null) {
        conditions.push(isNull(form.folderId));
      } else {
        conditions.push(eq(form.folderId, filters.folderId));
      }
    }
    if (filters?.search) {
      conditions.push(ilike(form.title, `%${filters.search}%`));
    }
    if (filters?.publishedOnly) {
      conditions.push(eq(form.isPublished, true));
    }

    const rows = await db
      .select()
      .from(form)
      .where(and(...conditions))
      .orderBy(desc(form.updatedAt));
    return rows.map((row) => this.withStatus(row));
  }

  async getById(id: string, userId: string) {
    const [row] = await db
      .select()
      .from(form)
      .where(and(eq(form.id, id), eq(form.userId, userId)))
      .limit(1);
    return row ? this.withStatus(row) : null;
  }

  async getByIdWithCurrentVersion(id: string, userId: string) {
    const dto = await this.getById(id, userId);
    if (!dto) return null;

    const version = dto.currentVersionId ? await this.getVersion(dto.currentVersionId) : null;
    return this.withDetail(dto, version);
  }

  async getBySlug(userId: string, slug: string) {
    const [row] = await db
      .select()
      .from(form)
      .where(and(eq(form.userId, userId), eq(form.slug, slug)))
      .limit(1);
    return row ? this.withStatus(row) : null;
  }

  async getPublishedById(id: string) {
    const [row] = await db
      .select()
      .from(form)
      .where(and(eq(form.id, id), eq(form.isPublished, true)))
      .limit(1);
    if (!row) return null;

    const versionId = row.publishedVersionId ?? row.currentVersionId;
    const version = versionId ? await this.getVersion(versionId) : null;
    return this.withDetail(this.withStatus(row), version);
  }

  async getPublishedBySlug(slug: string) {
    const [row] = await db
      .select()
      .from(form)
      .where(and(eq(form.slug, slug), eq(form.isPublished, true)))
      .orderBy(desc(form.publishedAt))
      .limit(1);
    return row ? this.withStatus(row) : null;
  }

  async getPublishedDetailBySlug(slug: string) {
    const dto = await this.getPublishedBySlug(slug);
    if (!dto) return null;

    const versionId = dto.publishedVersionId ?? dto.currentVersionId;
    const version = versionId ? await this.getVersion(versionId) : null;
    return this.withDetail(dto, version);
  }

  async update(id: string, userId: string, data: UpdateFormInput) {
    const updates: Partial<
      Pick<FormRow, "title" | "description" | "folderId" | "slug" | "themeId" | "themeUrl">
    > = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.folderId !== undefined) updates.folderId = data.folderId;
    if (data.themeId !== undefined) updates.themeId = data.themeId;
    if (data.themeUrl !== undefined) updates.themeUrl = data.themeUrl;
    if (data.title) updates.slug = await this.generateUniqueSlug(userId, data.title, id);

    if (Object.keys(updates).length === 0) {
      return this.getById(id, userId);
    }

    const [updated] = await withUniqueConstraint(
      () =>
        db
          .update(form)
          .set(updates)
          .where(and(eq(form.id, id), eq(form.userId, userId)))
          .returning(),
      FORM_SLUG_CONFLICT,
    );
    return updated ? this.withStatus(updated) : null;
  }

  async delete(id: string, userId: string) {
    const [deleted] = await db
      .delete(form)
      .where(and(eq(form.id, id), eq(form.userId, userId)))
      .returning();
    return deleted ? this.withStatus(deleted) : null;
  }

  async duplicate(id: string, userId: string, createdBy: string) {
    const original = await this.getById(id, userId);
    if (!original) return null;

    const schema = original.currentVersionId
      ? ((await this.getVersion(original.currentVersionId))?.schema ?? null)
      : null;

    const created = await this.create(userId, createdBy, {
      title: `${original.title} (Copy)`,
      description: original.description,
      folderId: original.folderId,
      schema: schema ?? undefined,
    });

    if (!created) return null;

    // If we had a schema from the original, save it as a draft for the new form
    if (schema) {
      await this.saveDraft(created.id, userId, createdBy, schema);
    }

    return this.getByIdWithCurrentVersion(created.id, userId);
  }

  async publish(id: string, userId: string, createdBy: string, schema?: FormSchema) {
    const existing = await this.getById(id, userId);
    if (!existing) return null;

    // Check if there's an existing draft version to promote
    const [existingDraft] = await db
      .select()
      .from(formVersion)
      .where(and(eq(formVersion.formId, id), eq(formVersion.source, "draft")))
      .limit(1);

    if (existingDraft && schema) {
      // Update the existing draft with the new schema and change source to manual
      const normalizedSchema = normalizeFormSchemaSafe(schema) ?? ensureDefaultFormSettings(schema);
      const schemaHash = await this.computeSchemaHash(normalizedSchema);

      await db
        .update(formVersion)
        .set({
          schema: normalizedSchema,
          schemaHash,
          source: "manual",
          createdBy,
        })
        .where(eq(formVersion.id, existingDraft.id));

      // Use the existing draft as the current version
      await db.update(form).set({ currentVersionId: existingDraft.id }).where(eq(form.id, id));
    } else if (schema && !existing.currentVersionId) {
      // No draft exists and no current version - create a new version
      const version = await this.saveVersion(id, userId, createdBy, {
        schema,
        source: "manual",
      });
      if (!version) {
        throw internalError("Failed to create a version for publishing");
      }
    }

    // Reload to get the updated currentVersionId
    const updated = await this.getById(id, userId);
    if (!updated?.currentVersionId) {
      throw badRequestError("Cannot publish a form without a saved version", "form_no_version");
    }

    const [published] = await db
      .update(form)
      .set({
        isPublished: true,
        publishedVersionId: updated.currentVersionId,
        publishedAt: new Date(),
      })
      .where(and(eq(form.id, id), eq(form.userId, userId)))
      .returning();
    return published ? this.withStatus(published) : null;
  }

  async unpublish(id: string, userId: string) {
    const [updated] = await db
      .update(form)
      .set({ isPublished: false, publishedAt: null })
      .where(and(eq(form.id, id), eq(form.userId, userId)))
      .returning();
    return updated ? this.withStatus(updated) : null;
  }

  /* ---------------------------------------------------------------------- */
  /* API access                                                             */
  /* ---------------------------------------------------------------------- */

  /**
   * Generate (or rotate) a form API key.
   *
   * Only a SHA-256 hash is persisted (`form.api_key_hash`); the plaintext key
   * is returned exactly once so it can be shown in the settings UI. Rotating
   * simply overwrites the hash, which invalidates the previous key.
   */
  async generateApiKey(id: string, userId: string): Promise<{ apiKey: string } | null> {
    const apiKey = `ikf_live_${randomHex(24)}`;
    const [updated] = await db
      .update(form)
      .set({ apiEnabled: true, apiKeyHash: await this.hashApiKey(apiKey) })
      .where(and(eq(form.id, id), eq(form.userId, userId)))
      .returning();
    if (!updated) return null;
    return { apiKey };
  }

  /** Disable the API and drop the stored key hash. */
  async revokeApiKey(id: string, userId: string) {
    const [updated] = await db
      .update(form)
      .set({ apiEnabled: false, apiKeyHash: null })
      .where(and(eq(form.id, id), eq(form.userId, userId)))
      .returning();
    return updated ? this.withStatus(updated) : null;
  }

  /** Enable/disable API submissions without rotating the key. */
  async setApiEnabled(id: string, userId: string, enabled: boolean) {
    const [updated] = await db
      .update(form)
      .set({ apiEnabled: enabled })
      .where(and(eq(form.id, id), eq(form.userId, userId)))
      .returning();
    return updated ? this.withStatus(updated) : null;
  }

  /** True when the presented key matches the enabled form's stored hash. */
  async verifyApiKey(id: string, apiKey: string): Promise<boolean> {
    const [row] = await db
      .select({ apiEnabled: form.apiEnabled, apiKeyHash: form.apiKeyHash })
      .from(form)
      .where(eq(form.id, id))
      .limit(1);

    if (!row?.apiEnabled || !row.apiKeyHash) return false;
    return (await this.hashApiKey(apiKey)) === row.apiKeyHash;
  }

  /** SHA-256 hex digest, matching the schema-hash helper above. */
  private async hashApiKey(apiKey: string): Promise<string> {
    const data = new TextEncoder().encode(apiKey);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  async getVersions(formId: string, userId: string) {
    const owned = await this.getById(formId, userId);
    if (!owned) return [];

    const rows = await db
      .select()
      .from(formVersion)
      .where(eq(formVersion.formId, formId))
      .orderBy(desc(formVersion.version));

    // Normalize on read so the API always returns the canonical v2 shape.
    return rows.map((row) => ({
      ...row,
      schema: normalizeFormSchemaSafe(row.schema) ?? row.schema,
    }));
  }

  async getVersion(versionId: string) {
    const [row] = await db.select().from(formVersion).where(eq(formVersion.id, versionId)).limit(1);
    return row ?? null;
  }

  /**
   * Save a draft version of the form schema.
   * If a draft version already exists, update it instead of creating a new one.
   * This prevents creating a new version on each save.
   */
  async saveDraft(formId: string, userId: string, createdBy: string, schema: FormSchema) {
    const owned = await this.getById(formId, userId);
    if (!owned) return null;

    const normalizedSchema = normalizeFormSchemaSafe(schema) ?? ensureDefaultFormSettings(schema);
    const schemaHash = await this.computeSchemaHash(normalizedSchema);

    // Check if there's an existing draft version (source = 'draft')
    const [existingDraft] = await db
      .select()
      .from(formVersion)
      .where(and(eq(formVersion.formId, formId), eq(formVersion.source, "draft")))
      .limit(1);

    if (existingDraft) {
      // Update the existing draft version
      const [updated] = await db
        .update(formVersion)
        .set({
          schema: normalizedSchema,
          schemaHash,
          createdBy,
        })
        .where(eq(formVersion.id, existingDraft.id))
        .returning();
      return updated;
    }

    // Create a new draft version
    const [maxRow] = await db
      .select({ max: sql<number>`coalesce(max(${formVersion.version}), 0)` })
      .from(formVersion)
      .where(eq(formVersion.formId, formId));
    const nextVersion = (maxRow?.max ?? 0) + 1;

    const [version] = await db
      .insert(formVersion)
      .values({
        formId,
        version: nextVersion,
        schemaHash,
        schema: normalizedSchema,
        source: "draft",
        prompt: null,
        changeSummary: null,
        restoredFromVersionId: null,
        createdBy,
      })
      .returning();
    if (!version) return null;

    await db
      .update(form)
      .set({ currentVersionId: version.id, revision: nextVersion })
      .where(eq(form.id, formId));

    return version;
  }

  async saveVersion(formId: string, userId: string, createdBy: string, data: SaveVersionInput) {
    const owned = await this.getById(formId, userId);
    if (!owned) return null;

    const [maxRow] = await db
      .select({ max: sql<number>`coalesce(max(${formVersion.version}), 0)` })
      .from(formVersion)
      .where(eq(formVersion.formId, formId));
    const nextVersion = (maxRow?.max ?? 0) + 1;
    // Store the canonical v2 shape.
    const normalizedSchema =
      normalizeFormSchemaSafe(data.schema) ?? ensureDefaultFormSettings(data.schema);
    const schemaHash = await this.computeSchemaHash(normalizedSchema);

    const [version] = await db
      .insert(formVersion)
      .values({
        formId,
        version: nextVersion,
        schemaHash,
        schema: normalizedSchema,
        source: data.source,
        prompt: data.prompt ?? null,
        changeSummary: data.changeSummary ?? null,
        restoredFromVersionId: data.restoredFromVersionId ?? null,
        createdBy,
      })
      .returning();
    if (!version) return null;

    await db
      .update(form)
      .set({ currentVersionId: version.id, revision: nextVersion })
      .where(eq(form.id, formId));

    return version;
  }

  async restoreVersion(
    formId: string,
    userId: string,
    versionId: string,
    createdBy: string,
    changeSummary?: string,
  ) {
    const owned = await this.getById(formId, userId);
    if (!owned) return null;

    const source = await this.getVersion(versionId);
    if (!source) return null;

    return this.saveVersion(formId, userId, createdBy, {
      schema: source.schema,
      source: "restore",
      changeSummary: changeSummary ?? `Restored from version ${source.version}`,
      restoredFromVersionId: source.id,
    });
  }

  private withStatus(row: FormRow): FormDTO {
    return { ...row, status: row.isPublished ? "published" : "draft" };
  }

  /**
   * Resolve the form's theme reference (themeId / themeUrl) into a full
   * renderer `schema.theme`. The form row stores ONLY the reference; the
   * rich visual config lives in the theme library. When no reference exists
   * the schema keeps whatever theme is embedded (legacy forms).
   */
  private async resolveTheme(schema: FormSchema, dto: FormDTO): Promise<FormSchema> {
    if (!dto.themeId) return schema;
    const [themeRow] = await db
      .select()
      .from(themeTable)
      .where(and(eq(themeTable.id, dto.themeId), eq(themeTable.userId, dto.userId)))
      .limit(1);
    if (!themeRow?.config) return schema;
    return {
      ...schema,
      theme: themeRow.config as Theme,
    };
  }

  private async withDetail(dto: FormDTO, version: FormVersionRow | null): Promise<FormDetailDTO> {
    let schema = version ? (normalizeFormSchemaSafe(version.schema) ?? null) : null;
    if (schema && dto.themeId) {
      schema = await this.resolveTheme(schema, dto);
    }
    return {
      ...dto,
      schema,
      version: version ?? null,
    };
  }

  private async computeSchemaHash(schema: FormSchema): Promise<string> {
    const data = new TextEncoder().encode(JSON.stringify(schema));
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  private async generateUniqueSlug(
    userId: string,
    title: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug =
      title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "") || "form";

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const conditions = [eq(form.userId, userId), eq(form.slug, slug)];
      if (excludeId) {
        conditions.push(sql`${form.id} != ${excludeId}`);
      }
      const [existing] = await db
        .select({ id: form.id })
        .from(form)
        .where(and(...conditions))
        .limit(1);

      if (!existing) return slug;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
}

export { createFormInputSchema, updateFormInputSchema, saveVersionInputSchema };
export type { FormRow, FormVersionRow };
