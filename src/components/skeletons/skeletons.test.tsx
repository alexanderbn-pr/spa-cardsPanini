import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { useAuthStore } from "@/stores/auth";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

/** Every fetch hangs until the test resolves it — models the first slow load. */
let pending: Array<(response: Response) => void> = [];

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <Wrapper>
      <App />
    </Wrapper>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    token: "stored-jwt",
    user: { id: 1, email: "a@b.c" },
  });
  pending = [];
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(
    () => new Promise<Response>((resolve) => pending.push(resolve)),
  );
});

describe("R-FBK-01 Suspense skeletons — zero blank frames", () => {
  it("shows AlbumSkeleton (lazy MainScreen Suspense fallback) AND FilterBarSkeleton (first teams/positions load) while data is in flight", () => {
    renderApp();

    // WHY: both boundaries must be filled on the very first frame — the lazy
    // chunk import AND the suspending queries happen at the same time.
    expect(screen.getByTestId("album-skeleton")).toBeTruthy();
    expect(screen.getByTestId("filter-bar-skeleton")).toBeTruthy();
  });

  it("replaces both skeletons with the real album and filter content once the data resolves", async () => {
    renderApp();
    expect(screen.getByTestId("album-skeleton")).toBeTruthy();

    // WHY: the requests do NOT all start together — `/positions` is only issued
    // after `/teams` resolves (query dedup + mount order), so resolving a single
    // batch leaves the filter bar suspended on a request that does not exist yet.
    // Drain until nothing is pending instead of assuming one wave.
    for (let round = 0; round < 10; round++) {
      const inFlight = pending.splice(0);
      if (inFlight.length === 0) break;
      inFlight.forEach((resolve) => resolve(jsonResponse(200, [])));
      // let React + react-query flush so a follow-up request can be issued
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    await waitFor(() =>
      expect(screen.queryByTestId("album-skeleton")).toBeNull(),
    );
    await waitFor(() =>
      expect(screen.queryByTestId("filter-bar-skeleton")).toBeNull(),
    );
    expect(screen.getByLabelText("Progreso de la colección")).toBeTruthy();
    expect(screen.getByLabelText("Equipo")).toBeTruthy();
  });
});
