import { useSuspenseQuery } from "@tanstack/react-query";
import { getTeams } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/keys";
import { useSelectedCollectionId } from "@/hooks/useSelectedCollectionId";

/**
 * Teams via suspense — R-ALB-01: the ONE `GET /teams` response is the single
 * source for the percentage bar, grouping and album totals (bare `/stickers`
 * arrays carry no totals, so nothing else can compute them).
 *
 * Scoped by the EFFECTIVE collection (explicit selection ?? first collection,
 * derived in `useSelectedCollectionId`): the hook suspends on `/collection` so
 * the request is ALWAYS `/teams?collectionId=<id>` — no unscoped `GET /teams`
 * fires first. The query key is `['teams', collectionId]` and switching
 * collection refetches the album/filter/create consumers without any signature
 * change. `queryKeys.teams` stays `['teams']` so prefix invalidation
 * (`useCreateSticker`, `App.handleClear`) still matches every scoped entry.
 */
export function useTeamsQuery() {
  const collectionId = useSelectedCollectionId();
  return useSuspenseQuery({
    queryKey: [...queryKeys.teams, collectionId] as const,
    queryFn: ({ signal }) => getTeams(collectionId, signal),
  });
}
