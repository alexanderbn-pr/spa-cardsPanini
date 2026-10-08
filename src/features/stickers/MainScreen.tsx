import AlbumSkeleton from "@/components/skeletons/AlbumSkeleton";
import PercentageBar from "./PercentageBar";
import StickerList from "./StickerList";
import { useStickersQuery } from "@/hooks/useStickersQuery";
import { useTeamsQuery } from "@/hooks/useTeamsQuery";
import type { AppliedFilters } from "@/types/filters";

interface MainScreenProps {
  /** App-committed filters — `null` = default teams view (zero `/stickers` calls). */
  applied?: AppliedFilters | null;
}

/**
 * Main album screen — R-ALB-01..04 + R-FLT-03. Totals ALWAYS come from the
 * single `['teams]` response (bare `/stickers` arrays carry no totals, RK-2).
 * With `applied !== null` the screen switches to the filtered flat view fed by
 * the page-loop query; while that first filtered batch is still in flight the
 * `AlbumSkeleton` keeps the frame filled (R-FBK-01, zero blank frames).
 */
export default function MainScreen({ applied = null }: MainScreenProps) {
  const { data: teams } = useTeamsQuery();
  const stickersQuery = useStickersQuery(applied);

  const checked = teams.reduce(
    (acc, team) =>
      acc + team.stickers.filter((sticker) => sticker.check).length,
    0,
  );
  const total = teams.reduce((acc, team) => acc + team.stickers.length, 0);

  return (
    <div className="flex flex-col gap-xl">
      <PercentageBar checked={checked} total={total} />
      {applied === null ? (
        <StickerList teams={teams} />
      ) : stickersQuery.data === undefined ? (
        <AlbumSkeleton />
      ) : (
        <StickerList
          stickers={stickersQuery.data}
          repetidos={applied.repetidos}
        />
      )}
    </div>
  );
}
