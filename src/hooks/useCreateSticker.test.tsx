import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateSticker } from "./useCreateSticker";
import { queryKeys } from "@/lib/api/keys";
import { useUiStore } from "@/stores/ui";
import type { CreateStickerRequest } from "@/types/api";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

const request: CreateStickerRequest = {
  sticker: {
    number: "007",
    name: "Lionel",
    positionId: 3,
    quantity: 0,
    check: false,
  },
  idTeam: 1,
};

const created = {
  id: 42,
  number: "007",
  name: "Lionel",
  positionId: 3,
  position: "DEL",
  check: false,
  quantity: 0,
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useCreateSticker(), { wrapper: Wrapper });
  return { client, ...hook };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  useUiStore.setState({ errorMessages: null });
});

describe("useCreateSticker — R-CRT-05/06 success path", () => {
  it("POSTs the exact request body, returns the created sticker and invalidates teams + stickers", async () => {
    const { client, result } = setup();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    fetchMock.mockResolvedValue(jsonResponse(201, created));

    act(() => {
      result.current.mutate(request);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Exact body — nothing added, nothing dropped.
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/stickers/create");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(request);

    // Server response surfaced to the caller (R-CRT-05 201 validates).
    expect(result.current.data).toMatchObject({ id: 42, number: "007" });

    // R-CRT-06: BOTH keys invalidate on success, then the caller closes.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.teams });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["stickers"] });
  });

  it("calls the per-call onSuccess after a successful mutation (modal closes on success)", async () => {
    const { result } = setup();
    const onSuccess = vi.fn();
    fetchMock.mockResolvedValue(jsonResponse(201, created));

    act(() => {
      result.current.mutate(request, { onSuccess });
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});

describe("useCreateSticker — R-CRT-07 error path", () => {
  it("does NOT invalidate when the request fails with 400 and surfaces the global modal", async () => {
    const { client, result } = setup();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        message: "Validation error",
        errors: {
          formErrors: [],
          fieldErrors: { body: ["positionId inválido"] },
        },
      }),
    );

    act(() => {
      result.current.mutate(request);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Nothing to refetch — the sticker was never created.
    expect(invalidateSpy).not.toHaveBeenCalled();
    // The normalized error already reached the global modal via client.ts.
    expect(useUiStore.getState().errorMessages).toEqual([
      "Validation error",
      "positionId inválido",
    ]);
  });
});
