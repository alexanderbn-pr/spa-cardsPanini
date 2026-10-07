import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useErrorMessages, useUiStore } from "./ui";

describe("ui store — global error feedback (R-FBK-02)", () => {
  beforeEach(() => {
    useUiStore.setState({ errorMessages: null });
  });

  it("openError keeps the message list and closeError closes it (modal state is data, not a boolean)", () => {
    useUiStore.getState().openError(["No se pudo conectar con el servidor"]);
    expect(useUiStore.getState().errorMessages).toEqual([
      "No se pudo conectar con el servidor",
    ]);

    useUiStore.getState().closeError();
    expect(useUiStore.getState().errorMessages).toBeNull();
  });

  it("reads through a field selector + useShallow so identical messages do not re-render consumers (R-XC-04)", () => {
    const { result } = renderHook(() => useErrorMessages());

    act(() => useUiStore.getState().openError(["boom"]));
    expect(result.current).toEqual(["boom"]);

    const firstRender = result.current;
    act(() => useUiStore.getState().openError(["boom"])); // new array, same content
    expect(result.current).toBe(firstRender); // shallow compare bails out — no re-render
  });
});
