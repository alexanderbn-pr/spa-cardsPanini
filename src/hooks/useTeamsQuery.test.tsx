import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTeamsQuery } from "./useTeamsQuery";
import { usePositionsQuery } from "./usePositionsQuery";
import { useCollectionStore } from "@/stores/collection";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

function renderWithClient<H>(hook: () => H) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(hook, { wrapper }) };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  // The teams query is scoped by the selected collection — reset it per test.
  useCollectionStore.setState({ collectionId: null });
});

describe("useTeamsQuery — the album's single source (R-ALB-01)", () => {
  it("derives the FIRST collection on cold load — /collection fires first, then a SCOPED /teams?collectionId=1 (NO unscoped /teams)", async () => {
    const teams = [{ id: 1, name: "Equipazo", collectionId: 1, stickers: [] }];
    fetchMock.mockImplementation((url: unknown) => {
      const target = String(url);
      if (target.includes("/collection")) {
        return Promise.resolve(jsonResponse(200, [{ id: 1, name: "Liga" }]));
      }
      if (target.includes("/teams")) {
        return Promise.resolve(jsonResponse(200, teams));
      }
      return Promise.resolve(jsonResponse(200, []));
    });

    const { result } = renderWithClient(useTeamsQuery);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(teams);

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    // The default collection must be known BEFORE teams is requested.
    expect(urls[0]).toContain("/collection");
    expect(urls[1]).toContain("/teams?collectionId=1");
    // No unscoped `GET /teams` ever fires (the W1 flash-all-teams bug).
    expect(urls.some((url) => url.endsWith("/teams"))).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("an EXPLICIT selection wins — /collection is still read, then /teams?collectionId=<id>", async () => {
    useCollectionStore.setState({ collectionId: 1 });
    const teams = [{ id: 1, name: "Equipazo", collectionId: 1, stickers: [] }];
    fetchMock.mockImplementation((url: unknown) => {
      const target = String(url);
      if (target.includes("/collection")) {
        return Promise.resolve(jsonResponse(200, [{ id: 2, name: "Otra" }]));
      }
      if (target.includes("/teams")) {
        return Promise.resolve(jsonResponse(200, teams));
      }
      return Promise.resolve(jsonResponse(200, []));
    });

    const { result } = renderWithClient(useTeamsQuery);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(teams);
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls[0]).toContain("/collection");
    // The explicit store value (1) is used, not the first collection (2).
    expect(urls[1]).toContain("/teams?collectionId=1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("usePositionsQuery — filter options source (R-FLT-01, WU4 consumer)", () => {
  it("resolves GET /positions through the same key factory", async () => {
    const positions = [{ id: 1, name: "Portero" }];
    fetchMock.mockResolvedValue(jsonResponse(200, positions));

    const { result } = renderWithClient(usePositionsQuery);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(positions);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/positions");
  });
});
