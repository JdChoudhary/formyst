import type { Choice } from "@repo/shared";

export interface RankOption {
  id: string;
  label: string;
}

/**
 * Ranking options live on the canonical `properties.choices` list, exactly like
 * every other choice field. (The component used to read `field.options`, which
 * does not exist on the schema, so the list rendered empty.)
 */
export function getRankOptions(choices: Choice[] | undefined): RankOption[] {
  return (choices ?? [])
    .map((choice) => ({ id: choice.ref ?? choice.label, label: choice.label }))
    .filter((option) => Boolean(option.id));
}

/**
 * Display order: whatever the respondent has ranked first, then every option
 * they have not ordered yet. Each option appears exactly once, so an untouched
 * field still shows the full list.
 */
export function getRankedOrder(options: RankOption[], value: unknown): string[] {
  const ids = options.map((option) => option.id);
  const ranked = Array.isArray(value)
    ? [...new Set((value as string[]).filter((id) => ids.includes(id)))]
    : [];
  return [...ranked, ...ids.filter((id) => !ranked.includes(id))];
}

/**
 * Swap `id` with its neighbour. Returns `null` when the move is impossible
 * (unknown id, or already at the top/bottom) so callers can skip the update.
 */
export function moveRanked(order: string[], id: string, direction: -1 | 1): string[] | null {
  const index = order.indexOf(id);
  if (index === -1) return null;
  const target = index + direction;
  if (target < 0 || target >= order.length) return null;
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
