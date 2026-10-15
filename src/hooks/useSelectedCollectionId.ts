import { useCollectionStore } from "@/stores/collection";
import { useCollectionsQuery } from "@/hooks/useCollectionsQuery";

/**
 * The EFFECTIVE selected collection: an explicit user selection wins; otherwise
 * the FIRST collection (default on load). Suspends on `/collection`, so the
 * teams query never issues an unscoped `GET /teams` before the default is known.
 * Returns null only when there are no collections (then `/teams` = all teams).
 */
export function useSelectedCollectionId(): number | null {
  const selected = useCollectionStore((state) => state.collectionId);
  const { data: collections } = useCollectionsQuery();
  if (selected !== null) return selected;
  return collections.length > 0 ? Number(collections[0].id) : null;
}
