import { Suspense } from "react";
import { useCollectionsQuery } from "@/hooks/useCollectionsQuery";
import { useSelectedCollectionId } from "@/hooks/useSelectedCollectionId";
import { useCollectionStore } from "@/stores/collection";
import { Select } from "@/components/ui/select";

/**
 * Select-sized ghost shown while `/collection` suspends (R-FBK-01) — ONE
 * pill ghost matching the real control anatomy so the tab never renders a
 * blank frame (design §3: sub-nav pill is 36px tall, rounded-full).
 */
function CollectionTabSkeleton() {
  return (
    <div
      data-testid="collection-tab-skeleton"
      aria-hidden="true"
      className="flex items-center"
    >
      <div className="h-9 w-40 rounded-full bg-surface-elevated animate-pulse" />
    </div>
  );
}

/**
 * The interactive selector. Changing the option publishes its `collectionId`
 * to the store, which scopes `useTeamsQuery` (`['teams', collectionId]` →
 * `/teams?collectionId=<id>`) — so the album, the filter team dropdown and the
 * create-sticker dropdown all follow the selection automatically.
 *
 * The FIRST collection is the derived default when none is chosen yet
 * (`useSelectedCollectionId`): the control reads that effective id, so no
 * effect is needed to seed the store.
 */
function CollectionList() {
  const { data: collections } = useCollectionsQuery();
  const selectedId = useSelectedCollectionId();
  const setCollectionId = useCollectionStore((state) => state.setCollectionId);

  if (collections.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay colecciones</p>;
  }

  return (
    <Select
      variant="pill"
      aria-label="Colecciones"
      value={String(selectedId ?? "")}
      onChange={(event) => {
        const raw = event.target.value;
        if (raw === "") return; // Number("") === 0 — guard emptiness FIRST
        const next = Number(raw);
        if (!Number.isNaN(next)) setCollectionId(next);
      }}
    >
      {collections.map((collection) => (
        <option key={String(collection.id)} value={String(collection.id)}>
          {collection.completed
            ? `${collection.name} (Completada)`
            : collection.name}
        </option>
      ))}
    </Select>
  );
}

/**
 * Interactive collections selector (T8) mounted next to the Create-Sticker
 * button. It owns its own `Suspense` boundary so the surrounding screen (and
 * `App`'s lazy album) is never blocked by the collections fetch.
 */
export default function CollectionTab() {
  return (
    <Suspense fallback={<CollectionTabSkeleton />}>
      <CollectionList />
    </Suspense>
  );
}
