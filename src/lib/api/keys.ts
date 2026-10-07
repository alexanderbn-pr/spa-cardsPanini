import type { StickersFilters } from "./query-string";

/** Query Key Factory (R-XC-04) — one source of truth for cache identity. */
export const queryKeys = {
  teams: ["teams"] as const,
  stickers: (filters: StickersFilters, page: number) =>
    ["stickers", filters, page] as const,
  positions: ["positions"] as const,
} as const;
