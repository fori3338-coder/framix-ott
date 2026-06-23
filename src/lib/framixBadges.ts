/**
 * FRAMIX Badge System — single source of truth for content labels.
 *
 * Derives FRAMIX-branded content status labels from a Drama record.
 * Labels: ORIGINAL (인증) · EXCLUSIVE(독점작) · NEW(신작) · HOT(인기작)
 *         · FRAMIX PICK(추천작) · RECOMMENDED(추천) · UPDATING(업데이트중) · FINISHED(완결작)
 *
 * Used by every card so badges look identical across the whole service.
 */
import type { Drama } from "../types";

export type FramixBadgeKey =
  | "exclusive"
  | "new"
  | "hot"
  | "pick"
  | "recommended"
  | "updating"
  | "finished";

export interface FramixBadgeDef {
  key: FramixBadgeKey;
  /** English brand token */
  label: string;
  /** Korean reading */
  ko: string;
}

export const FRAMIX_BADGES: Record<FramixBadgeKey, FramixBadgeDef> = {
  exclusive: { key: "exclusive", label: "EXCLUSIVE", ko: "독점작" },
  new: { key: "new", label: "NEW", ko: "신작" },
  hot: { key: "hot", label: "HOT", ko: "인기작" },
  pick: { key: "pick", label: "FRAMIX PICK", ko: "추천작" },
  recommended: { key: "recommended", label: "RECOMMENDED", ko: "추천" },
  updating: { key: "updating", label: "UPDATING", ko: "업데이트중" },
  finished: { key: "finished", label: "FINISHED", ko: "완결작" },
};

/** Is this title a verified FRAMIX Original? */
export function isFramixOriginal(drama: Pick<Drama, "isOriginal">): boolean {
  return Boolean(drama.isOriginal);
}

/**
 * Resolve the ordered list of status badge keys for a drama.
 * Order = visual priority (most important first).
 */
export function getFramixBadgeKeys(
  drama: Pick<
    Drama,
    "isExclusive" | "isNew" | "rating" | "views" | "top10Rank" | "totalEpisodes" | "episodes"
  >,
): FramixBadgeKey[] {
  const keys: FramixBadgeKey[] = [];

  if (drama.isExclusive) keys.push("exclusive");
  if (drama.isNew) keys.push("new");

  const isHot =
    (drama.top10Rank != null && drama.top10Rank > 0 && drama.top10Rank <= 10) ||
    (drama.views ?? 0) >= 1_000_000;
  if (isHot) keys.push("hot");

  // Completion state — derived from available episodes vs. announced total.
  const epCount = drama.episodes?.length ?? 0;
  const total = drama.totalEpisodes ?? 0;
  if (total > 0 && epCount >= total) {
    keys.push("finished");
  } else if (epCount > 0) {
    keys.push("updating");
  }

  // Editorial endorsement — highest ratings become a FRAMIX PICK.
  if ((drama.rating ?? 0) >= 9.2) {
    keys.push("pick");
  } else if ((drama.rating ?? 0) >= 8.5) {
    keys.push("recommended");
  }

  return keys;
}

/**
 * Convenience: the badge keys most worth surfacing on a compact card,
 * capped to avoid clutter. Status-only (Original mark is rendered separately).
 */
export function getCardBadgeKeys(
  drama: Parameters<typeof getFramixBadgeKeys>[0],
  max = 2,
): FramixBadgeKey[] {
  return getFramixBadgeKeys(drama).slice(0, max);
}
