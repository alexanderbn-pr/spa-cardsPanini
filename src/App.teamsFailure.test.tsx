import { fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "./App";
import { createQueryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

/** Requests counted per path — the double-call regression asserts on these. */
function callCount(path: string): number {
  return fetchMock.mock.calls.filter(([url]) => String(url).includes(path))
    .length;
}

/**
 * R-XC-05/ADR-4: this harness mounts the REAL `AppRoutes` on the REAL
 * production client — no `retry:false` forced inline (that blindness is what
 * hid the double-call bug).
 */
function renderApp() {
  const client = createQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/stickers"]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    token: "stored-jwt",
    user: { id: 1, email: "a@b.c" },
  });
  useUiStore.setState({ errorMessages: null });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(jsonResponse(200, []));
});

describe("R-XC-05 — /teams fails fast, no automatic second call", () => {
  it("fires exactly ONE GET /teams on 500 (double-call regression) and window focus adds none", async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).includes("/teams")
        ? jsonResponse(500, { message: "Internal server error" })
        : jsonResponse(200, []),
    );

    renderApp();

    await waitFor(() => expect(callCount("/teams")).toBeGreaterThanOrEqual(1));
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(callCount("/teams")).toBe(1);

    fireEvent(window, new Event("focus"));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(callCount("/teams")).toBe(1);
  });

  it("/teams 500 => fallback + main-screen and Header mounted; no black screen (R-FBK-03 S1)", async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).includes("/teams")
        ? jsonResponse(500, { message: "Internal server error" })
        : jsonResponse(200, []),
    );

    const { getByTestId, getByRole, queryByRole } = renderApp();

    await waitFor(() => expect(callCount("/teams")).toBe(1));
    await waitFor(() => expect(getByRole("alert")).toBeTruthy());
    expect(getByTestId("error-fallback")).toBeTruthy();
    expect(getByTestId("main-screen")).toBeTruthy();
    expect(queryByRole("heading")).toBeTruthy();
    expect(queryByRole("alertdialog")).toBeTruthy();
  });

  it("Reintentar click => exactly ONE new /teams request; success re-renders (R-FBK-03 S2)", async () => {
    let count = 0;
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes("/teams")) {
        count++;
        if (count === 1)
          return jsonResponse(500, { message: "Internal server error" });
        // MUST be TeamSchema-valid (incl. `stickers`): a bare {id,name} passes
        // HTTP 200 but fails the zod parse in apiFetch → INVALID-response error
        // → the retry never actually succeeds and content never re-renders.
        return jsonResponse(200, [{ id: 1, name: "Team A", stickers: [] }]);
      }
      return jsonResponse(200, []);
    });

    const { getByRole, getByTestId, queryByRole, queryByTestId } = renderApp();

    await waitFor(() => expect(callCount("/teams")).toBe(1));
    await waitFor(() => expect(getByTestId("error-fallback")).toBeTruthy());

    const c0 = callCount("/teams");
    fireEvent.click(getByTestId("error-fallback"));
    await waitFor(() => expect(callCount("/teams")).toBe(c0 + 1));
    // THEN clause: success re-renders the content — no stale fallback.
    await waitFor(() => expect(queryByTestId("error-fallback")).toBeNull());
    expect(queryByRole("alert")).toBeNull();
    expect(getByTestId("main-screen")).toBeTruthy();
    // Content arrives async (lazy MainScreen + suspense) after the reset.
    await waitFor(() =>
      expect(getByRole("heading", { name: "Team A" })).toBeTruthy(),
    );
  });

  it("ErrorModal survives boundary; dismiss closes modal, fallback remains, tree mounted (R-FBK-03 S3)", async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).includes("/teams")
        ? jsonResponse(500, { message: "Internal server error" })
        : jsonResponse(200, []),
    );

    const { getByRole, getByTestId, queryByRole } = renderApp();

    await waitFor(() => expect(callCount("/teams")).toBe(1));
    await waitFor(() => expect(getByRole("alert")).toBeTruthy());
    expect(queryByRole("alertdialog")).toBeTruthy();

    // getByRole fails loudly if the dismiss label is ever renamed.
    fireEvent.click(getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(queryByRole("alertdialog")).toBeNull());
    expect(getByTestId("error-fallback")).toBeTruthy();
    expect(getByTestId("main-screen")).toBeTruthy();
  });

  it("401 while fallback shows => auto-logout navigates to /login, no stale fallback (R-FBK-03 S4)", async () => {
    let teamsCalls = 0;
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes("/teams")) {
        teamsCalls++;
        // 1st call: 500 → fallback. 2nd call (Reintentar): 401 → the REAL
        // auto-logout path in lib/api/client.ts:118 → RequireAuth <Navigate>.
        if (teamsCalls === 1)
          return jsonResponse(500, { message: "Internal server error" });
        return jsonResponse(401, { message: "Unauthorized" });
      }
      return jsonResponse(200, []);
    });

    const { getByRole, getByTestId, queryByTestId } = renderApp();

    await waitFor(() => expect(callCount("/teams")).toBe(1));
    await waitFor(() => expect(getByRole("alert")).toBeTruthy());
    expect(getByTestId("error-fallback")).toBeTruthy();

    // Real 401 (not a direct logout() call): Reintentar issues the refetch,
    // apiFetch sees 401 with a token → store logout() → guard navigates.
    fireEvent.click(getByTestId("error-fallback"));
    await waitFor(() =>
      expect(getByRole("button", { name: "Iniciar sesión" })).toBeTruthy(),
    );
    expect(queryByTestId("error-fallback")).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("/teams network error => ONE request (R-XC-05 S1)", async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).includes("/teams")
        ? Promise.reject(new Error("Network error"))
        : jsonResponse(200, []),
    );

    renderApp();
    await waitFor(() => expect(callCount("/teams")).toBe(1));
    await new Promise((r) => setTimeout(r, 1200));
    expect(callCount("/teams")).toBe(1);
  });

  it("/positions 5xx retries ONCE while /teams succeeds once (R-XC-05 S2, teams-only scope)", async () => {
    // /positions is issued only AFTER /teams resolves (mount order — see
    // skeletons.test.tsx), so teams must succeed here for positions to fire.
    fetchMock.mockImplementation((url: string) =>
      String(url).includes("/positions")
        ? jsonResponse(500, { message: "Internal server error" })
        : jsonResponse(200, []),
    );

    renderApp();
    await waitFor(() => expect(callCount("/teams")).toBe(1));
    await waitFor(() =>
      expect(callCount("/positions")).toBeGreaterThanOrEqual(1),
    );
    // global retry: 5xx is not 4xx ⇒ exactly ONE retry, then stop (~1s delay)
    await new Promise((r) => setTimeout(r, 1500));
    expect(callCount("/positions")).toBe(2);
    expect(callCount("/teams")).toBe(1);
  });
});
