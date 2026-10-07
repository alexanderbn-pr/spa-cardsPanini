/** Filters that reach the server on GET /stickers. Drafts live outside this type. */
export interface StickersFilters {
  teamId?: string | number;
  name?: string;
  positionId?: string | number;
  /** Serialized as the strings "true"/"false" — the API takes enum strings, not booleans. */
  check?: boolean;
  /** Exact-match only on the API (no gt operator) — never used for "repetidos". */
  quantity?: number;
}

/**
 * `page` is required and `limit` is capped at 100 by the API, so both are always
 * sent; empty/undefined filters are omitted so untouched drafts never pollute the URL.
 */
export function buildStickersQuery(
  filters: StickersFilters,
  page: number,
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "100");

  if (filters.teamId !== undefined && filters.teamId !== "") {
    params.set("teamId", String(filters.teamId));
  }
  if (filters.name) {
    params.set("name", filters.name);
  }
  if (filters.positionId !== undefined && filters.positionId !== "") {
    params.set("positionId", String(filters.positionId));
  }
  if (filters.check !== undefined) {
    params.set("check", String(filters.check));
  }
  if (filters.quantity !== undefined) {
    params.set("quantity", String(filters.quantity));
  }

  return `?${params.toString()}`;
}
