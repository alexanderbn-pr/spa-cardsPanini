import { useSuspenseQuery } from "@tanstack/react-query";
import { getPositions } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/keys";

/**
 * Positions via suspense — R-FLT-01: filter options source (consumed by the
 * WU4 filters section). Created here because tasks.md 6.1 pairs it with the
 * teams hook; keys stay in the WU1 key factory.
 */
export function usePositionsQuery() {
  return useSuspenseQuery({
    queryKey: queryKeys.positions,
    queryFn: ({ signal }) => getPositions(signal),
  });
}
