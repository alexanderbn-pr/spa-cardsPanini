import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFilterDraft } from "./useFilterDraft";
import { EMPTY_FILTERS, type AppliedFilters } from "@/types/filters";

/** WHY: R-FLT-02 — drafts are LOCAL until `apply()` (the "Aplicar filtros" click). */
describe("useFilterDraft — drafts independent of applied (R-FLT-02)", () => {
  it("starts the draft mirrored from the committed applied filters, not from typed input", () => {
    const committed: AppliedFilters = {
      teamId: "2",
      check: true,
      repetidos: false,
    };

    const { result } = renderHook(() => useFilterDraft(committed));

    expect(result.current.draft).toEqual({
      name: "",
      teamId: "2",
      positionId: "",
      check: "true",
      repetidos: false,
    });
  });

  it("keeps typed edits local — the committed applied filters only change when apply() is called", () => {
    const committed = EMPTY_FILTERS;
    const { result } = renderHook(() => useFilterDraft(committed));

    act(() => result.current.setFields({ name: "Lewandowski" }));

    // WHY: typing without clicking "Aplicar filtros" must never reach the query
    // key — the prop object is untouched and apply() has not run yet.
    expect(committed).toEqual({ repetidos: false });
    expect(result.current.draft.name).toBe("Lewandowski");
  });

  it("apply() returns AppliedFilters built from the drafts (trimmed, empties dropped) and resets the draft to mirror it", () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_FILTERS));

    act(() =>
      result.current.setFields({
        name: "  Lewandowski ",
        teamId: "2",
        check: "true",
        repetidos: true,
      }),
    );

    let applied: AppliedFilters | undefined;
    act(() => {
      applied = result.current.apply();
    });

    expect(applied).toEqual({
      name: "Lewandowski",
      teamId: "2",
      check: true,
      repetidos: true,
    });
    // WHY: after the commit the controls must show exactly what is queried
    // (design §5 "reset-from-props after apply") — no stale drafts linger.
    expect(result.current.draft).toEqual({
      name: "Lewandowski",
      teamId: "2",
      positionId: "",
      check: "true",
      repetidos: true,
    });
  });

  it("reset(applied) re-syncs the draft from props (design §5 state ownership)", () => {
    const { result } = renderHook(() => useFilterDraft(EMPTY_FILTERS));

    act(() => result.current.setFields({ name: "stale" }));
    act(() =>
      result.current.reset({
        positionId: "11",
        check: false,
        repetidos: true,
      }),
    );

    expect(result.current.draft).toEqual({
      name: "",
      teamId: "",
      positionId: "11",
      check: "false",
      repetidos: true,
    });
  });
});
