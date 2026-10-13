import StickerCard from "./StickerCard";
import { compareStickerNumber } from "@/lib/number-order";
import type { Sticker, Team } from "@/types/api";

/**
 * R-ALB-02/03/04: team header = name + id + `{checked}/{total}` (or the green
 * rounded "Completed" pill when every sticker is checked, replacing the
 * counts) + the card grid ordered by `number` ascending.
 *
 * Ordering delegates to the ONE shared comparator (`src/lib/number-order.ts`,
 * ADR-4). The previous `byNumber` hybrid (`Number()` + `localeCompare`
 * fallback) put "10" before "3a" — deleted, not patched.
 *
 * `stickers?` (ADR-2, filtered view only): the grid renders this matched
 * SUBSET, while the header keeps the FULL-team counts (R-ALB-02 under
 * filtering). Rows absent from `/teams` never reach here — the join in
 * `StickerList` drops them (`/teams` is the spine).
 */
export default function TeamSection({
  team,
  stickers,
}: {
  team: Team;
  stickers?: Sticker[];
}) {
  const total = team.stickers.length;
  const checked = team.stickers.filter((sticker) => sticker.check).length;
  const completed = total > 0 && checked === total;
  const ordered = [...(stickers ?? team.stickers)].sort((a, b) =>
    compareStickerNumber(a.number, b.number),
  );

  return (
    <section aria-label={`Equipo ${team.name}`}>
      <div className="flex items-center gap-sm border-b border-[var(--color-hairline)] py-md">
        <h2 className="text-xl font-medium md:text-2xl">{team.name}</h2>
        <span className="text-[13px] text-muted-foreground">{team.id}</span>

        <span className="ml-auto">
          {completed ? (
            <span className="rounded-full border border-success px-3 py-1 text-[13px] tracking-[0.24px] text-success">
              Completed
            </span>
          ) : (
            <span className="text-sm font-semibold">
              {checked}/{total}
            </span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-md pt-lg md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {ordered.map((sticker) => (
          <StickerCard key={sticker.id} sticker={sticker} />
        ))}
      </div>
    </section>
  );
}
