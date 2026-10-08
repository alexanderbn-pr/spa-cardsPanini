import type { ReactNode } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "./App";
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

/**
 * R-RT-06: jsdom never touches real history — the router's current pathname
 * is read through this probe so assertions are route-derived (R-RT-01/02).
 */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

/** App mounts MainScreen (useTeamsQuery) → every render needs a client + a /teams stub. */
function appTree(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return (
    <Wrapper>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <LocationProbe />
      </MemoryRouter>
    </Wrapper>
  );
}

function renderApp(path = "/") {
  return render(appTree(path));
}

function currentPath(): string | null {
  return screen.queryByTestId("location")?.textContent ?? null;
}

const authedUser = { id: 1, email: "a@b.c" };

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ token: null, user: null });
  useUiStore.setState({ errorMessages: null });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(jsonResponse(200, []));
});

describe("App fallback at `/` — R-RT-01 (R-AUTH-07 state gate superseded)", () => {
  it("renders ONLY the login screen when no token exists — no header, no main slot, URL /login", async () => {
    renderApp("/");

    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.queryByTestId("main-screen")).toBeNull();
    await waitFor(() => expect(currentPath()).toBe("/login"));
  });

  it("renders header + main screen (and no login form) once a token is present, URL /stickers", async () => {
    useAuthStore.setState({ token: "stored-jwt", user: authedUser });

    renderApp("/");

    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByTestId("main-screen")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Iniciar sesión" })).toBeNull();
    await waitFor(() => expect(currentPath()).toBe("/stickers"));
  });

  it("flips back to login after logout — the guard tracks the store reactively", async () => {
    useAuthStore.setState({ token: "stored-jwt", user: authedUser });
    renderApp("/");
    expect(screen.getByRole("banner")).toBeTruthy();

    act(() => {
      useAuthStore.getState().logout();
    });

    await waitFor(() => expect(currentPath()).toBe("/login"));
    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
  });
});

describe("Guards both directions — R-RT-01 AC2", () => {
  it("no token at /stickers redirects to /login (replace) and the login screen renders", async () => {
    renderApp("/stickers");

    await waitFor(() => expect(currentPath()).toBe("/login"));
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.queryByTestId("main-screen")).toBeNull();
  });

  it("stored token at /login redirects to /stickers (replace) and the main screen renders", async () => {
    useAuthStore.setState({ token: "stored-jwt", user: authedUser });

    renderApp("/login");

    await waitFor(() => expect(currentPath()).toBe("/stickers"));
    expect(screen.getByTestId("main-screen")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Iniciar sesión" })).toBeNull();
  });
});

describe("Direct entry (cold load) — R-RT-01 AC1", () => {
  it("unauthed cold load at /login renders the login screen at that exact URL — no redirect", () => {
    renderApp("/login");

    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
    expect(currentPath()).toBe("/login");
  });

  it("authed cold load at /stickers renders the main screen at that exact URL — no redirect", () => {
    useAuthStore.setState({ token: "stored-jwt", user: authedUser });

    renderApp("/stickers");

    expect(screen.getByTestId("main-screen")).toBeTruthy();
    expect(currentPath()).toBe("/stickers");
  });
});

describe("Unknown-path fallback — R-RT-01 AC6", () => {
  it("unauthed /nope lands on /login by the same token rule", async () => {
    renderApp("/nope");

    await waitFor(() => expect(currentPath()).toBe("/login"));
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
  });

  it("authed /nope lands on /stickers by the same token rule", async () => {
    useAuthStore.setState({ token: "stored-jwt", user: authedUser });

    renderApp("/nope");

    await waitFor(() => expect(currentPath()).toBe("/stickers"));
    expect(screen.getByTestId("main-screen")).toBeTruthy();
  });
});

describe("ErrorModal mounted on both routes — R-RT-04 / R-FBK-02 AC5", () => {
  it("opens from ui.errorMessages on /login and is dismissible while login stays mounted", async () => {
    useUiStore.setState({ errorMessages: ["Fallo del servidor"] });

    renderApp("/login");

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain("Fallo del servidor");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
  });

  it("opens from ui.errorMessages on /stickers and is dismissible while the main screen stays mounted", async () => {
    useAuthStore.setState({ token: "stored-jwt", user: authedUser });
    useUiStore.setState({ errorMessages: ["Fallo del servidor"] });

    renderApp("/stickers");

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain("Fallo del servidor");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByTestId("main-screen")).toBeTruthy();
  });

  it("keeps the modal closed on /login when no error is seeded — field-mapped 400s never reach the store", () => {
    renderApp("/login");

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(useUiStore.getState().errorMessages).toBeNull();
  });
});
