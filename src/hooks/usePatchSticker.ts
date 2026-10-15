import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { patchSticker } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/keys";
import type { Sticker, Team } from "@/types/api";

export interface PatchStickerVars {
  id: Sticker["id"];
  delta: number;
}

interface RollbackContext {
  prevTeams: Array<[QueryKey, Team[]]>;
  prevStickers: Array<[QueryKey, Sticker[]]>;
}

/** Applies `next` to the sticker with `id`, leaves every other sticker untouched. */
function mapById(
  stickers: Sticker[],
  id: Sticker["id"],
  next: (sticker: Sticker) => Sticker,
): Sticker[] {
  return stickers.map((sticker) =>
    sticker.id === id ? next(sticker) : sticker,
  );
}

/**
 * Write-through: updates the sticker in EVERY cache that can hold it — all
 * `['stickers', …]` entries and EVERY `['teams', …]` entry (the teams key is
 * collection-scoped, `['teams', collectionId]`, so a PREFIX match is required —
 * `setQueryData` matches the key EXACTLY and would miss the scoped entries).
 * This keeps the card, the team counts and the percentage bar in lockstep.
 */
function writeSticker(
  client: QueryClient,
  id: Sticker["id"],
  next: (sticker: Sticker) => Sticker,
): void {
  client.setQueriesData<Sticker[]>({ queryKey: ["stickers"] }, (prev) =>
    prev === undefined ? prev : mapById(prev, id, next),
  );
  client.setQueriesData<Team[]>({ queryKey: queryKeys.teams }, (prev) =>
    prev === undefined
      ? prev
      : prev.map((team) => ({
          ...team,
          stickers: mapById(team.stickers, id, next),
        })),
  );
}

/**
 * Optimistic write-through + rollback — R-INT-01/02/03, design §4.
 *
 * - onMutate: cancel in-flight refetches, snapshot, then write `{quantity+delta,
 *   check = quantity>=1}` into all caches → UI reacts before the network does.
 * - onError: restore the snapshot AND invalidate — invalidation exists ONLY on
 *   the rollback path (the failed optimistic guess must re-sync with the DB).
 *   The modal itself was already opened by `client.ts`.
 * - onSuccess: the PATCH response is authoritative server state → written
 *   verbatim into the same caches; `check` is the SERVER's derived value,
 *   never a client computation.
 * - NO onSettled invalidation: that would be an N×2 refetch storm per click
 *   burst and the write-through already equals server truth (design §4).
 *
 * The body is always `{delta}` — PATCH rejects `check`/`quantity`
 * (additionalProperties:false); the server owns both fields.
 */
export function usePatchSticker() {
  const client = useQueryClient();

  return useMutation<Sticker, unknown, PatchStickerVars, RollbackContext>({
    mutationFn: ({ id, delta }) => patchSticker(id, delta),

    onMutate: async ({ id, delta }) => {
      await client.cancelQueries({ queryKey: queryKeys.teams });
      await client.cancelQueries({ queryKey: ["stickers"] });

      const prevTeams = client
        .getQueriesData<Team[]>({ queryKey: queryKeys.teams })
        .filter((entry): entry is [QueryKey, Team[]] => entry[1] !== undefined);
      const prevStickers = client
        .getQueriesData<Sticker[]>({ queryKey: ["stickers"] })
        .filter(
          (entry): entry is [QueryKey, Sticker[]] => entry[1] !== undefined,
        );

      writeSticker(client, id, (sticker) => {
        const quantity = Math.max(0, sticker.quantity + delta);
        return { ...sticker, quantity, check: quantity >= 1 };
      });

      return { prevTeams, prevStickers };
    },

    onError: (_error, _vars, context) => {
      if (context === undefined) return;
      context.prevTeams.forEach(([key, data]) => {
        client.setQueryData(key, data);
      });
      context.prevStickers.forEach(([key, data]) => {
        client.setQueryData(key, data);
      });
      // Rollback ONLY path → re-sync with the server (design §4).
      void client.invalidateQueries({ queryKey: queryKeys.teams });
      void client.invalidateQueries({ queryKey: ["stickers"] });
    },

    onSuccess: (serverSticker) => {
      writeSticker(client, serverSticker.id, () => serverSticker);
    },
  });
}
