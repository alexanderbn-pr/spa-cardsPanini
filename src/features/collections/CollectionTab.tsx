import { Suspense } from "react";
import { useCollectionsQuery } from "@/hooks/useCollectionsQuery";
import { useSelectedCollectionId } from "@/hooks/useSelectedCollectionId";
import { useCollectionStore } from "@/stores/collection";
import { cn } from "@/lib/utils";

/**
 * Horizontal ghost row shown while `/collection` suspends (R-FBK-01) — three
 * pill ghosts matching the real tab anatomy so the strip never renders a
 * blank frame (design §3: sub-nav pills are 36px tall, rounded-full).
 */
function CollectionTabSkeleton() {
  return (
    <div
      data-testid="collection-tab-skeleton"
      aria-hidden="true"
      className="flex animate-pulse items-center gap-sm"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="h-9 w-24 rounded-full bg-surface-elevated"
        />
      ))}
    </div>
  );
}

/**
 * The interactive strip. Selecting a pill publishes its `collectionId` to the
 * store, which scopes `useTeamsQuery` (`['teams', collectionId]` →
 * `/teams?collectionId=<id>`) — so the album, the filter team dropdown and the
 * create-sticker dropdown all follow the selection automatically.
 *
 * The FIRST collection is the derived default when none is chosen yet
 * (`useSelectedCollectionId`): the highlight reads that effective id, so no
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
    <div
      role="group"
      aria-label="Colecciones"
      className="flex items-center gap-sm overflow-x-auto"
    >
      {collections.map((collection) => {
        const selected = Number(collection.id) === selectedId;
        return (
          <button
            key={String(collection.id)}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              setCollectionId(Number(collection.id));
            }}
            className={cn(
              // DESIGN `sub-nav-pill`: 36px tall, rounded-full, 16px side padding.
              "flex h-9 shrink-0 items-center gap-sm rounded-full px-lg text-sm tracking-[0.24px] whitespace-nowrap transition-colors",
              selected
                ? "bg-surface-elevated font-bold text-foreground underline"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {collection.name}
            {collection.completed ? (
              <span className="rounded-full border border-success px-2 py-0.5 text-[11px] tracking-[0.24px] text-success">
                Completada
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Interactive collections strip (T8) mounted next to the Create-Sticker button.
 * It owns its own `Suspense` boundary so the surrounding screen (and `App`'s
 * lazy album) is never blocked by the collections fetch.
 */
export default function CollectionTab() {
  return (
    <Suspense fallback={<CollectionTabSkeleton />}>
      <CollectionList />
    </Suspense>
  );
}
