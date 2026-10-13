import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePatchSticker } from "./usePatchSticker";
import { queryKeys } from "@/lib/api/keys";
import { useUiStore } from "@/stores/ui";
import type { Team } from "@/types/api";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

function makeTeams(): Team[] {
  return [
    {
      id: 1,
      name: "Equipazo",
      stickers: [
        {
          id: 10,
          number: "001",
          name: "Lionel",
          positionId: null,
          position: null,
          check: true,
          quantity: 2,
        },
        {
          id: 11,
          number: "002",
          name: "Andrés",
          positionId: null,
          position: null,
          check: false,
          quantity: 0,
        },
      ],
    },
  ];
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => usePatchSticker(), { wrapper: Wrapper });
  return { client, ...hook };
}

function cachedQuantity(client: QueryClient): number {
  const teams = client.getQueryData<Team[]>(queryKeys.teams) ?? [];
  return teams[0]?.stickers[0]?.quantity ?? -1;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  useUiStore.setState({ errorMessages: null });
});

describe("usePatchSticker — R-INT-01 optimistic write-through", () => {
  it("writes quantity+1 into the teams cache WHILE the request is still pending", async () => {
    const { client, result } = setup();
    client.setQueryData(queryKeys.teams, makeTeams());
    let resolveFetch!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    act(() => {
      result.current.mutate({ id: 10, delta: 1 });
    });

    // Request still in flight → 3 can only come from the optimistic update.
    await waitFor(() => expect(cachedQuantity(client)).toBe(3));
    expect(result.current.isPending).toBe(true);

    resolveFetch(
      jsonResponse(200, {
        id: 10,
        number: "001",
        name: "Lionel",
        positionId: null,
        position: null,
        check: true,
        quantity: 3,
      }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("sends ONLY {delta} in the PATCH body — never check or quantity (R-INT-03 server ownership)", async () => {
    const { result } = setup();
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        id: 10,
        number: "001",
        name: "Lionel",
        positionId: null,
        position: null,
        check: true,
        quantity: 3,
      }),
    );

    act(() => {
      result.current.mutate({ id: 10, delta: 1 });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ delta: 1 });
  });

  it("writes the AUTHORITATIVE server response over the optimistic guess on success", async () => {
    const { client, result } = setup();
    client.setQueryData(queryKeys.teams, makeTeams());
    // Server answers with different values than the guess → server wins.
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        id: 10,
        number: "001",
        name: "Lionel",
        positionId: null,
        position: null,
        check: true,
        quantity: 9,
      }),
    );

    act(() => {
      result.current.mutate({ id: 10, delta: 1 });
    });

    await waitFor(() => expect(cachedQuantity(client)).toBe(9));
    const teams = client.getQueryData<Team[]>(queryKeys.teams) ?? [];
    expect(teams[0]?.stickers[0]?.check).toBe(true);
  });

  it("does NOT invalidate queries on success — write-through already equals server truth (no refetch storm)", async () => {
    const { client, result } = setup();
    client.setQueryData(queryKeys.teams, makeTeams());
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        id: 10,
        number: "001",
        name: "Lionel",
        positionId: null,
        position: null,
        check: true,
        quantity: 3,
      }),
    );

    act(() => {
      result.current.mutate({ id: 10, delta: 1 });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("usePatchSticker — R-INT-01 rollback on error", () => {
  it("restores the snapshot, invalidates ONLY on the rollback path and surfaces the modal", async () => {
    const { client, result } = setup();
    client.setQueryData(queryKeys.teams, makeTeams());
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    fetchMock.mockResolvedValue(
      jsonResponse(500, {
        message: "boom",
        errors: { formErrors: [], fieldErrors: { body: [] } },
      }),
    );

    act(() => {
      result.current.mutate({ id: 10, delta: 1 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // Snapshot restored — the failed optimistic guess is gone.
    expect(cachedQuantity(client)).toBe(2);
    // Re-sync with the DB exists ONLY here (design §4).
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.teams });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["stickers"] });
    // The normalized error already reached the global modal via client.ts.
    expect(useUiStore.getState().errorMessages).not.toBeNull();
  });
});
