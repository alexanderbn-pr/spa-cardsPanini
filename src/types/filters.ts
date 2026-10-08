/**
 * Filter contract for the filter section (R-FLT-01..04).
 *
 * `FilterDraft` is the shape the CONTROLS hold (`""` = "Todos"); `AppliedFilters`
 * is the ONLY shape allowed into the query key — committed on "Aplicar filtros"
 * and nothing else (R-FLT-02).
 *
 * NOTE: this module lives in `src/types/` rather than a feature, because BOTH
 * `features/stickers/MainScreen` and `hooks/*` need it. Design §6 forbids
 * feature→feature imports (enforced by the ESLint guard) and hooks may not
 * depend on features — a shared types module is the only legal common ancestor.
 */

/** Draft values exactly as the controls hold them: `""` means "Todos"/unchecked. */
export interface FilterDraft {
  name: string;
  teamId: string;
  positionId: string;
  check: "" | "true" | "false";
  repetidos: boolean;
}

/**
 * Committed on "Aplicar filtros". Structurally a `StickersFilters` plus the
 * client-side-only `repetidos` flag (R-FLT-04: the API `quantity` param is
 * exact-match, there is NO gt operator — `repetidos` never reaches the URL).
 */
export interface AppliedFilters {
  name?: string;
  teamId?: string;
  positionId?: string;
  check?: boolean;
  /** Client-side `quantity > 1` predicate — never serialized into the query. */
  repetidos: boolean;
}

/** Fresh session: nothing applied → the default teams view renders (R-ALB-01). */
export const EMPTY_FILTERS: AppliedFilters = { repetidos: false };

/** All controls untouched — the value "Aplicar filtros" is clicked on a pristine bar. */
export const EMPTY_DRAFT: FilterDraft = {
  name: "",
  teamId: "",
  positionId: "",
  check: "",
  repetidos: false,
};
