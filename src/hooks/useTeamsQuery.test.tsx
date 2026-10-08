import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTeamsQuery } from "./useTeamsQuery";
import { usePositionsQuery } from "./usePositionsQuery";

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
});

describe("useTeamsQuery — the album's single source (R-ALB-01)", () => {
  it("resolves GET /teams through the WU1 key factory so totals never depend on paginated /stickers", async () => {
    const teams = [{ id: 1, name: "Equipazo", stickers: [] }];
    fetchMock.mockResolvedValue(jsonResponse(200, teams));

    const { result } = renderWithClient(useTeamsQuery);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(teams);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/teams");
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
