import { useSuspenseQuery } from "@tanstack/react-query";
import { getEditions } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/keys";

/**
 * Editions via suspense — R-CRT-07/08: edition selector in both
 * FiltersSection and CreateStickerForm uses this hook to fetch from
 * GET /editions. The key `['editions']` is shared across the app
 * (no duplicate fetches).
 */
export function useEditionsQuery() {
  return useSuspenseQuery({
    queryKey: queryKeys.editions,
    queryFn: ({ signal }) => getEditions(signal),
  });
}
