import type { ReactNode } from "react";
import { Suspense } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStickersQuery } from "./useStickersQuery";
import { queryKeys } from "@/lib/api/keys";
import { useCollectionStore } from "@/stores/collection";
import type { AppliedFilters } from "@/types/filters";
import type { Sticker } from "@/types/api";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

function makeSticker(id: number): Sticker {
  return {
    id,
    number: String(id).padStart(3, "0"),
    name: `Nombre ${id}`,
    positionId: 10,
    position: "Delantero",
    check: false,
    quantity: 0,
  };
}

/**
 * The hook reads `useSelectedCollectionId`, which SUSPENDS on `/collection` —
 * every render needs a Suspense boundary, exactly like MainScreen gets inside
 * App's album boundary.
 */
function makeWrapper(client: QueryClient) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <Suspense fallback={null}>{children}</Suspense>
    </QueryClientProvider>
  );
  return Wrapper;
}

function stickerUrls(): string[] {
  return fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.includes("/stickers"));
}

/**
 * `/collection` branch shared by every stub: the suspense query resolves with
 * `[]` unless a test overrides it — the effective collection is then null and
 * `collectionId` must stay OFF the /stickers URL.
 */
function collectionBranch(url: string, body: unknown = []) {
  if (url.includes("/collection")) {
    return Promise.resolve(jsonResponse(200, body));
  }
  return undefined;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  // The collection store scopes every /stickers request — reset it per test.
  useCollectionStore.setState({ collectionId: null });
});

describe("useStickersQuery — R-FLT-03 request shape + page-loop aggregation (RK-2)", () => {
  it("loops pages until a short batch, aggregating into ONE cache entry with page always present", async () => {
    const page0 = Array.from({ length: 100 }, (_, index) =>
      makeSticker(index + 1),
    );
    const page1 = [makeSticker(101), makeSticker(102), makeSticker(103)];
    fetchMock.mockImplementation((url: unknown) => {
      const target = String(url);
      const collection = collectionBranch(target);
      if (collection) return collection;
      if (target.includes("page=0"))
        return Promise.resolve(jsonResponse(200, page0));
      return Promise.resolve(jsonResponse(200, page1));
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const applied: AppliedFilters = {
      teamId: "2",
      check: true,
      repetidos: false,
    };

    const { result } = renderHook(() => useStickersQuery(applied), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.data).toHaveLength(103));

    const urls = stickerUrls();
    // WHY: `page` is REQUIRED by the API and `limit` is capped at 100 — both
    // are always sent; a short page (< 100) stops the loop at exactly 2 calls.
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("page=0");
    expect(urls[0]).toContain("limit=100");
    expect(urls[0]).toContain("teamId=2");
    expect(urls[0]).toContain("check=true");
    expect(urls[1]).toContain("page=1");
    // TRAP: repetidos is client-side — the `quantity` param is exact-match only.
    expect(urls.every((url) => !url.includes("quantity="))).toBe(true);
    expect(urls.every((url) => !url.includes("repetidos"))).toBe(true);

    // ONE cache entry for the whole aggregated result (task 8.3).
    const stickerEntries = client
      .getQueryCache()
      .getAll()
      .filter((query) => query.queryKey[0] === "stickers");
    expect(stickerEntries).toHaveLength(1);
    expect(
      client.getQueryData(queryKeys.stickers({ teamId: "2", check: true }, 0)),
    ).toHaveLength(103);
  });

  it("keeps the previous result visible while the next apply is fetching (keepPreviousData)", async () => {
    const first = [makeSticker(1), makeSticker(2)];
    fetchMock.mockImplementation((url: unknown) => {
      const target = String(url);
      const collection = collectionBranch(target);
      if (collection) return collection;
      if (target.includes("page=0"))
        return Promise.resolve(jsonResponse(200, first));
      return Promise.resolve(jsonResponse(200, []));
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const firstApply: AppliedFilters = { name: "uno", repetidos: false };
    const secondApply: AppliedFilters = { name: "dos", repetidos: false };

    const { result, rerender } = renderHook(
      ({ applied }: { applied: AppliedFilters }) => useStickersQuery(applied),
      { wrapper: makeWrapper(client), initialProps: { applied: firstApply } },
    );

    await waitFor(() => expect(result.current.data).toHaveLength(2));

    // Second apply → new key → its fetch hangs; the previous rows must remain.
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
    rerender({ applied: secondApply });

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it("stays disabled (zero /stickers requests) while applied is null — the default view owns the screen", async () => {
    fetchMock.mockImplementation((url: unknown) => {
      const target = String(url);
      const collection = collectionBranch(target);
      if (collection) return collection;
      return Promise.resolve(jsonResponse(200, []));
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useStickersQuery(null), {
      wrapper: makeWrapper(client),
    });

    // The hook suspends on /collection first — wait for the disabled state.
    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(stickerUrls()).toHaveLength(0);
  });
});

describe("useStickersQuery — collectionId scoping (backend REQUIRES it on /stickers)", () => {
  it("sends collectionId=<id> when the effective collection is set — explicit selection wins", async () => {
    useCollectionStore.setState({ collectionId: 7 });
    fetchMock.mockImplementation((url: unknown) => {
      const target = String(url);
      const collection = collectionBranch(target, [{ id: 3, name: "Otra" }]);
      if (collection) return collection;
      if (target.includes("page=0"))
        return Promise.resolve(jsonResponse(200, [makeSticker(1)]));
      return Promise.resolve(jsonResponse(200, []));
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const applied: AppliedFilters = { name: "uno", repetidos: false };

    const { result } = renderHook(() => useStickersQuery(applied), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.data).toHaveLength(1));

    const urls = stickerUrls();
    expect(urls).toHaveLength(1);
    // The EXPLICIT store selection (7) wins over the first collection (3).
    expect(urls[0]).toContain("collectionId=7");
    expect(urls[0]).toContain("name=uno");
  });

  it("omits collectionId when the effective collection is null — store null AND /collection empty", async () => {
    useCollectionStore.setState({ collectionId: null });
    fetchMock.mockImplementation((url: unknown) => {
      const target = String(url);
      const collection = collectionBranch(target);
      if (collection) return collection;
      if (target.includes("page=0"))
        return Promise.resolve(jsonResponse(200, [makeSticker(1)]));
      return Promise.resolve(jsonResponse(200, []));
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const applied: AppliedFilters = { teamId: "2", repetidos: false };

    const { result } = renderHook(() => useStickersQuery(applied), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.data).toHaveLength(1));

    const urls = stickerUrls();
    expect(urls).toHaveLength(1);
    expect(urls[0]).not.toContain("collectionId");
    expect(urls[0]).toContain("teamId=2");
  });

  it("keys the cache by collectionId — switching collections refetches instead of reusing", async () => {
    useCollectionStore.setState({ collectionId: 7 });
    fetchMock.mockImplementation((url: unknown) => {
      const target = String(url);
      const collection = collectionBranch(target, [{ id: 7, name: "Siete" }]);
      if (collection) return collection;
      return Promise.resolve(jsonResponse(200, [makeSticker(1)]));
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const applied: AppliedFilters = { name: "uno", repetidos: false };

    const { result, rerender } = renderHook(
      ({ applied }: { applied: AppliedFilters }) => useStickersQuery(applied),
      { wrapper: makeWrapper(client), initialProps: { applied } },
    );

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(
      client.getQueryData(
        queryKeys.stickers({ name: "uno", collectionId: 7 }, 0),
      ),
    ).toHaveLength(1);

    // Switch collection → new key → fresh fetch (cache miss, not reuse).
    useCollectionStore.setState({ collectionId: 9 });
    rerender({ applied });

    await waitFor(() =>
      expect(
        client.getQueryData(
          queryKeys.stickers({ name: "uno", collectionId: 9 }, 0),
        ),
      ).toHaveLength(1),
    );
    // Two distinct cache entries — one per collection.
    const stickerEntries = client
      .getQueryCache()
      .getAll()
      .filter((query) => query.queryKey[0] === "stickers");
    expect(stickerEntries).toHaveLength(2);
  });
});
