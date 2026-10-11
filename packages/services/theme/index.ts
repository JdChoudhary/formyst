import db, { and, eq, asc } from "@repo/database";
import { theme as themeTable } from "@repo/database/schema";
import type { Theme } from "@repo/shared";
import { notFoundError, withUniqueConstraint } from "../errors";
import type { CreateThemeInput, UpdateThemeInput } from "./model";

type ThemeRow = typeof themeTable.$inferSelect;

/** A theme name is unique per user (`theme_user_name_unique`). */
const THEME_NAME_CONFLICT = {
  message: "A theme with this name already exists",
  reason: "theme_name_taken",
} as const;

/** A theme row with the full renderer config. */
export interface ThemeDTO extends ThemeRow {
  config: Theme;
}

function toDTO(row: ThemeRow): ThemeDTO {
  return { ...row, config: row.config as Theme };
}

function resolveConfig(input: { name?: string; config?: Theme }): Theme {
  if (input.config) {
    return input.config as Theme;
  }
  // Fallback — shouldn't happen with the new API, but be safe.
  return {
    colors: {
      background: "#FFFFFF",
      question: "#3D3D3D",
      answer: "#4FB0AE",
      button: "#4FB0AE",
    },
    typography: { fontFamily: "Inter", fontSize: "base", fontWeight: "normal" },
    fields: { font_size: "small", alignment: "left" },
    screens: { font_size: "small", alignment: "center" },
    layout: { maxWidth: "md", questionAlignment: "left", spacing: "normal" },
    background: { color: "#ffffff", layout: "fullscreen", brightness: 0 },
    button: { radius: "8px", style: "solid", transparent: false },
    origin: "new",
  } as Theme;
}

export class ThemeService {
  async getAll(userId: string): Promise<ThemeDTO[]> {
    const rows = await db
      .select()
      .from(themeTable)
      .where(eq(themeTable.userId, userId))
      .orderBy(asc(themeTable.name));
    return rows.map(toDTO);
  }

  async getById(userId: string, id: string): Promise<ThemeDTO | null> {
    const [row] = await db
      .select()
      .from(themeTable)
      .where(and(eq(themeTable.id, id), eq(themeTable.userId, userId)))
      .limit(1);
    return row ? toDTO(row) : null;
  }

  async getDefault(userId: string): Promise<ThemeDTO | null> {
    const [row] = await db
      .select()
      .from(themeTable)
      .where(and(eq(themeTable.userId, userId), eq(themeTable.isDefault, true)))
      .limit(1);
    return row ? toDTO(row) : null;
  }

  async create(userId: string, createdBy: string, data: CreateThemeInput) {
    const config = resolveConfig(data);

    const [row] = await withUniqueConstraint(
      () =>
        db
          .insert(themeTable)
          .values({
            userId,
            createdBy,
            name: data.name ?? "Untitled",
            // Always insert as non-default; `setDefault` promotes it inside a
            // transaction so `theme_user_default_unique` can never trip mid-write.
            isDefault: false,
            origin: data.origin,
            sourceThemeId: data.sourceThemeId ?? null,
            config: config as Theme,
          })
          .returning(),
      THEME_NAME_CONFLICT,
    );
    if (!row) return null;

    if (data.isDefault) {
      return (await this.setDefault(userId, row.id)) ?? toDTO(row);
    }
    return toDTO(row);
  }

  async update(userId: string, id: string, data: UpdateThemeInput) {
    const existing = await this.getById(userId, id);
    if (!existing) return null;

    const config = data.config ? (data.config as Theme) : existing.config;

    const [row] = await withUniqueConstraint(
      () =>
        db
          .update(themeTable)
          .set({
            name: data.name,
            // Promotion happens in `setDefault`; never flag two defaults at once.
            isDefault: data.isDefault ? false : existing.isDefault,
            config: config as Theme,
            updatedAt: new Date(),
          })
          .where(and(eq(themeTable.id, id), eq(themeTable.userId, userId)))
          .returning(),
      THEME_NAME_CONFLICT,
    );
    if (!row) return null;

    if (data.isDefault) {
      return (await this.setDefault(userId, row.id)) ?? toDTO(row);
    }
    return toDTO(row);
  }

  async delete(userId: string, id: string) {
    const [row] = await db
      .delete(themeTable)
      .where(and(eq(themeTable.id, id), eq(themeTable.userId, userId)))
      .returning();
    return row ? toDTO(row) : null;
  }

  /** Duplicate an existing theme (origin = "duplicate", keeps sourceThemeId). */
  async duplicate(userId: string, id: string, createdBy: string) {
    const source = await this.getById(userId, id);
    if (!source) return null;

    return this.create(userId, createdBy, {
      name: `${source.name} (Copy)`,
      origin: "duplicate",
      sourceThemeId: source.id,
      config: source.config,
    });
  }

  /** Make one theme the workspace default (clears the rest). */
  async setDefault(userId: string, id: string) {
    const existing = await this.getById(userId, id);
    if (!existing) throw notFoundError("Theme not found", "theme_not_found");

    // One transaction so the clear-then-set can never leave two rows flagged
    // (which the partial unique index would reject).
    await db.transaction(async (tx) => {
      await tx.update(themeTable).set({ isDefault: false }).where(eq(themeTable.userId, userId));
      await tx
        .update(themeTable)
        .set({ isDefault: true })
        .where(and(eq(themeTable.id, id), eq(themeTable.userId, userId)));
    });
    return this.getById(userId, id);
  }
}
