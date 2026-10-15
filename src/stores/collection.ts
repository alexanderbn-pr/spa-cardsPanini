import { create } from "zustand";

interface CollectionState {
  /**
   * null = no EXPLICIT collection chosen yet. The effective selection is derived
   * (`useSelectedCollectionId`): an explicit id wins, otherwise the first
   * collection becomes the default on load.
   */
  collectionId: number | null;
  setCollectionId: (id: number | null) => void;
}

/**
 * Selected-collection store — PURE state only (no hooks imported here). The
 * effective id is derived by `useSelectedCollectionId` from this explicit
 * selection ?? the first collection. `collectionId` filters
 * `GET /teams?collectionId=X` (it is NOT the sticker `editionId`). Components
 * MUST read through a field selector (`useCollectionStore((s) => s.collectionId)`)
 * — never the whole store (zustand-5 rule): changing the selection must not
 * re-render unrelated consumers.
 */
export const useCollectionStore = create<CollectionState>()((set) => ({
  collectionId: null,
  setCollectionId: (collectionId) => set({ collectionId }),
}));
