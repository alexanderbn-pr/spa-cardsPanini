import { useSuspenseQuery } from "@tanstack/react-query";
import { getCollections } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/keys";

/**
 * Collections via suspense — feeds the interactive `CollectionTab`.
 *
 * `GET /collection` returns `CollectionResponse[] = [{ id, name, completed? }]`.
 * The selected collection's `id` scopes the teams query — the tab publishes it
 * to the collection store, which `useTeamsQuery` reads to build
 * `/teams?collectionId=<id>`. Collections therefore DRIVE the collection filter
 * (they are not display-only).
 */
export function useCollectionsQuery() {
  return useSuspenseQuery({
    queryKey: queryKeys.collections,
    queryFn: ({ signal }) => getCollections(signal),
  });
}
