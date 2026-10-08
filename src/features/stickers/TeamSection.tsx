import StickerCard from "./StickerCard";
import type { Team } from "@/types/api";

/**
 * R-ALB-02/03/04: team header = name + id + `{checked}/{total}` (or the green
 * rounded "Completed" pill when every sticker is checked, replacing the
 * counts) + the card grid ordered by `number` ascending.
 */
/**
 * R-ALB-04 ordering. The OpenAPI schema types `number` as a plain string
 * (example "001") with NO padding guarantee, so a bare `localeCompare` would
 * render unpadded values as 1, 10, 2 — numeric compare with a string fallback
 * is correct under both formats (verify finding V1).
 */
function byNumber(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b);
}

export default function TeamSection({ team }: { team: Team }) {
  const total = team.stickers.length;
  const checked = team.stickers.filter((sticker) => sticker.check).length;
  const completed = total > 0 && checked === total;
  const ordered = [...team.stickers].sort((a, b) =>
    byNumber(a.number, b.number),
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

      <div className="grid grid-cols-1 gap-md pt-lg md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ordered.map((sticker) => (
          <StickerCard key={sticker.id} sticker={sticker} />
        ))}
      </div>
    </section>
  );
}
