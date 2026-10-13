import TeamSection from "./TeamSection";
import type { Sticker, Team } from "@/types/api";

interface StickerListProps {
  /** Default album view — team-grouped sections straight from `['teams]` (R-ALB-01/04). */
  teams?: Team[];
  /** Filtered view — aggregated `/stickers` rows joined onto `teams` by id (R-FLT-03/06, ADR-2). */
  stickers?: Sticker[];
  /** "Repetidos" applied → CLIENT-SIDE `quantity > 1` predicate (R-FLT-04). */
  repetidos?: boolean;
}

/**
 * Album renderer with the two modes design §4 defines: the DEFAULT view groups
 * the single `['teams]` response (no `/stickers` request until filters are
 * applied), the FILTERED view joins the aggregated `/stickers` rows onto the
 * `/teams` structure by sticker `id` (ADR-2) and — when "repetidos" is on —
 * keeps only `quantity > 1` here on the client, because the API `quantity`
 * param is exact-match (there is NO gt operator).
 */
export default function StickerList({
  teams,
  stickers,
  repetidos,
}: StickerListProps) {
  if (stickers !== undefined) {
    const shown = repetidos
      ? stickers.filter((sticker) => sticker.quantity > 1)
      : stickers;

    // ADR-2: `/stickers` rows carry NO `teamId` — `id` is the shared identity
    // with the `['teams]` cache (the same join `usePatchSticker.writeSticker`
    // performs). Membership is taken AFTER the repetidos predicate; the
    // structure below is the `/teams` response EXACT order. Inline on purpose —
    // React Compiler memoizes, NO useMemo.
    const matchedIds = new Set(shown.map((sticker) => sticker.id));

    // DRIFT: a `/stickers` row absent from `['teams]` is silently DROPPED —
    // near-impossible (both caches share the same server ids) and by design
    // `/teams` is the spine, so there is NO flat fallback for orphans.
    const sections = (teams ?? []).filter((team) =>
      team.stickers.some((sticker) => matchedIds.has(sticker.id)),
    );

    if (sections.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          Sin resultados para los filtros aplicados.
        </p>
      );
    }

    return (
      <section
        aria-label="Resultados filtrados"
        className="flex flex-col gap-xl"
      >
        {sections.map((team) => (
          <TeamSection
            key={team.id}
            team={team}
            stickers={team.stickers.filter((sticker) =>
              matchedIds.has(sticker.id),
            )}
          />
        ))}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-xl">
      {(teams ?? []).map((team) => (
        <TeamSection key={team.id} team={team} />
      ))}
    </div>
  );
}
