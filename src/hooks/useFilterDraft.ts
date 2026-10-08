import { useState } from "react";
import type { AppliedFilters, FilterDraft } from "@/types/filters";

/** Props → draft: `undefined`/`false-check`/empties become the controls' `""`. */
function toDraft(applied: AppliedFilters): FilterDraft {
  return {
    name: applied.name ?? "",
    teamId: applied.teamId === undefined ? "" : String(applied.teamId),
    positionId:
      applied.positionId === undefined ? "" : String(applied.positionId),
    check: applied.check === undefined ? "" : applied.check ? "true" : "false",
    repetidos: applied.repetidos,
  };
}

/** Draft → applied: trims, drops empties, keeps `repetidos` (client-side only). */
function toApplied(draft: FilterDraft): AppliedFilters {
  const name = draft.name.trim();
  return {
    ...(name ? { name } : {}),
    ...(draft.teamId ? { teamId: draft.teamId } : {}),
    ...(draft.positionId ? { positionId: draft.positionId } : {}),
    ...(draft.check !== "" ? { check: draft.check === "true" } : {}),
    repetidos: draft.repetidos,
  };
}

/**
 * Local filter DRAFTS — R-FLT-02: editing inputs NEVER changes the committed
 * `applied` filters and NEVER issues a request; only `apply()` produces the
 * `AppliedFilters` that App lifts into the query key ("Aplicar filtros" click).
 * `apply()` also resets the draft from the value it just committed (design §5:
 * "reset-from-props after apply" — the draft and the applied value are the same
 * object, so controls always mirror what is actually being queried).
 */
export function useFilterDraft(applied: AppliedFilters) {
  const [draft, setDraft] = useState<FilterDraft>(() => toDraft(applied));

  /** Partial patch — one call per control change; no per-field setters (no memo rules). */
  function setFields(patch: Partial<FilterDraft>) {
    setDraft((previous) => ({ ...previous, ...patch }));
  }

  /** Commits the drafts and re-syncs the draft from the committed value. */
  function apply(): AppliedFilters {
    const next = toApplied(draft);
    setDraft(toDraft(next));
    return next;
  }

  /** Explicit re-sync from props (exposed for tests and external resets). */
  function reset(next: AppliedFilters) {
    setDraft(toDraft(next));
  }

  return { draft, setFields, apply, reset };
}
