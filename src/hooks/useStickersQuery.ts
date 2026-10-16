import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getStickers } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/keys";
import type { StickersFilters } from "@/lib/api/query-string";
import type { AppliedFilters } from "@/types/filters";
import type { Sticker } from "@/types/api";
import { useSelectedCollectionId } from "@/hooks/useSelectedCollectionId";

/** API caps `limit` at 100; the page-loop stops at 10 pages → ≤1000 rows (design §4). */
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

export function toServerFilters(applied: AppliedFilters): StickersFilters {
  const server: StickersFilters = {};
  if (applied.name) server.name = applied.name;
  if (applied.teamId) server.teamId = applied.teamId;
  if (applied.positionId) server.positionId = applied.positionId;
  if (applied.editionId) server.editionId = applied.editionId;
  if (applied.check !== undefined) server.check = applied.check;
  return server;
}

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

export function useStickersQuery(applied: AppliedFilters | null) {
  const collectionId = useSelectedCollectionId();
  const serverFilters = toServerFilters(applied ?? { repetidos: false });
  if (collectionId !== null) {
    serverFilters.collectionId = collectionId;
  }

  return useQuery({
    queryKey: queryKeys.stickers(serverFilters, 0),
    queryFn: ({ signal }) => fetchAllPages(serverFilters, signal),
    enabled: applied !== null,
    placeholderData: keepPreviousData,
  });
}
