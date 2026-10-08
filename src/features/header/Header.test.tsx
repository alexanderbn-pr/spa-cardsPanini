import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "@/App";
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

/** Route-derived URL probe — R-RT-06: MemoryRouter history, not jsdom. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

/** App mounts MainScreen (useTeamsQuery) → tests need a QueryClient + /teams stub.
 *  R-RT-04/06: AppRoutes runs inside a MemoryRouter so Header's useNavigate is live. */
function renderApp(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <Wrapper>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <LocationProbe />
      </MemoryRouter>
    </Wrapper>,
  );
}

function readPersistedToken(): string | null {
  const raw = localStorage.getItem("ligae-auth");
  if (raw === null) return null;
  return (JSON.parse(raw) as { state: { token: string | null } }).state.token;
}

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ token: null, user: null });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(jsonResponse(200, []));
});

describe("Header — R-HDR-01 contents on /stickers (R-RT-03 AC4)", () => {
  it("shows logo, the literal app name and a logout control for an authed user at /stickers", () => {
    useAuthStore.setState({
      token: "jwt-1",
      user: { id: 1, email: "a@b.c" },
    });
    renderApp("/stickers");

    const banner = screen.getByRole("banner");
    expect(banner.textContent).toContain("Stickers ligaE");
    expect(screen.getByAltText("Logo de Stickers ligaE")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe("/stickers");
  });
});

describe("Header — R-HDR-02 visibility is route-driven (R-RT-03 AC4)", () => {
  it("is NOT in the DOM on /login, so the login route stays header-free", () => {
    renderApp("/login");

    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe("/login");
  });
});

describe("Header — R-RT-02 logout navigates to /login (AC3 stranding regression)", () => {
  it("clicking logout at /stickers clears token + localStorage and lands on exactly /login, no banner", async () => {
    useAuthStore.setState({
      token: "jwt-1",
      user: { id: 1, email: "a@b.c" },
    });
    renderApp("/stickers");
    expect(readPersistedToken()).toBe("jwt-1");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe("/login"),
    );
    expect(useAuthStore.getState().token).toBeNull();
    expect(readPersistedToken()).toBeNull();
    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
  });
});
