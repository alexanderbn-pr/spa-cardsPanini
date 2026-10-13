import { useSuspenseQuery } from "@tanstack/react-query";
import { getTeams } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/keys";

/**
 * Teams via suspense — R-ALB-01: the ONE `GET /teams` response is the single
 * source for the percentage bar, grouping and album totals (bare `/stickers`
 * arrays carry no totals, so nothing else can compute them).
 */
export function useTeamsQuery() {
  return useSuspenseQuery({
    queryKey: queryKeys.teams,
    queryFn: ({ signal }) => getTeams(signal),
  });
}
