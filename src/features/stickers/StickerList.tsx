import StickerCard from "./StickerCard";
import TeamSection from "./TeamSection";
import type { Sticker, Team } from "@/types/api";

interface StickerListProps {
  /** Default album view — team-grouped sections straight from `['teams]` (R-ALB-01/04). */
  teams?: Team[];
  /** Filtered view — aggregated `/stickers` rows (R-FLT-03: NO totals rendered, RK-2). */
  stickers?: Sticker[];
  /** "Repetidos" applied → CLIENT-SIDE `quantity > 1` predicate (R-FLT-04). */
  repetidos?: boolean;
}

/**
 * Album renderer with the two modes design §4 defines: the DEFAULT view groups
 * the single `['teams]` response (no `/stickers` request until filters are
 * applied), the FILTERED view flattens the aggregated `/stickers` rows and —
 * when "repetidos" is on — keeps only `quantity > 1` here on the client, because
 * the API `quantity` param is exact-match (there is NO gt operator).
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

    if (shown.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          Sin resultados para los filtros aplicados.
        </p>
      );
    }

    return (
      <section
        aria-label="Resultados filtrados"
        className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {shown.map((sticker) => (
          <StickerCard key={sticker.id} sticker={sticker} />
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
