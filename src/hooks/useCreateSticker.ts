import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSticker } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/keys";
import type { CreateStickerRequest, Sticker } from "@/types/api";

/**
 * R-CRT-06: data concern only — on a successful 201 it invalidates BOTH
 * `['teams']` (the album spine, R-ALB-01) AND `['stickers']` (the filtered
 * view, a no-op when unapplied) so the created sticker appears. Closing the
 * modal is the CALLER's per-call `onSuccess` (design A3/§State), keeping this
 * hook free of UI side effects.
 *
 * `useTeamsQuery` is `useSuspenseQuery`, so the background refetch keeps the
 * previous data rendered — the album never blanks to a skeleton (R-CRT-06).
 * Errors are already normalized and surfaced by `client.ts` (surface defaults
 * true) — no `onError` needed here.
 */
export function useCreateSticker() {
  const client = useQueryClient();

  return useMutation<Sticker, unknown, CreateStickerRequest>({
    mutationFn: (input) => createSticker(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.teams });
      void client.invalidateQueries({ queryKey: ["stickers"] });
    },
  });
}
