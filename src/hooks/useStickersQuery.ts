import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getStickers } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/keys";
import type { StickersFilters } from "@/lib/api/query-string";
import type { AppliedFilters } from "@/types/filters";
import type { Sticker } from "@/types/api";

/** API caps `limit` at 100; the page-loop stops at 10 pages → ≤1000 rows (design §4). */
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

/**
 * Applied → server query. `repetidos` is STRIPPED here on purpose: the API
 * `quantity` param is exact-match (no gt operator), so "repetidos" is a
 * CLIENT-SIDE `quantity > 1` predicate (R-FLT-04) and must never reach the URL
 * or the query key — toggling it alone reuses the same cache entry (RK-2/§4).
 */
export function toServerFilters(applied: AppliedFilters): StickersFilters {
  const server: StickersFilters = {};
  if (applied.name) server.name = applied.name;
  if (applied.teamId) server.teamId = applied.teamId;
  if (applied.positionId) server.positionId = applied.positionId;
  if (applied.check !== undefined) server.check = applied.check;
  return server;
}

/**
 * `/stickers` is a BARE ARRAY with no totals and `page` is REQUIRED (≤100 per
 * page), so one logical "results" set = sequential pages merged into a single
 * array (R-FLT-03, RK-2). Stops early on a short page or at MAX_PAGES — never
 * more than 10 requests per apply (rate limit ~100, R5).
 */
async function fetchAllPages(
  filters: StickersFilters,
  signal?: AbortSignal,
): Promise<Sticker[]> {
  const all: Sticker[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const batch = await getStickers(filters, page, signal);
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return all;
}

/**
 * Filtered results (R-FLT-02/03): mounted ONLY after "Aplicar filtros"
 * (`applied !== null`) — the default view renders from `['teams']` and issues
 * no `/stickers` request at all. The whole page-loop aggregates into ONE cache
 * entry (`page=0` sentinel — the WU1 key factory's page slot is the entry id).
 * `keepPreviousData` keeps the previous result set visible while the next
 * apply fetches (no blank frame between filter changes).
 */
export function useStickersQuery(applied: AppliedFilters | null) {
  const serverFilters = toServerFilters(applied ?? { repetidos: false });

  return useQuery({
    queryKey: queryKeys.stickers(serverFilters, 0),
    queryFn: ({ signal }) => fetchAllPages(serverFilters, signal),
    enabled: applied !== null,
    placeholderData: keepPreviousData,
  });
}
