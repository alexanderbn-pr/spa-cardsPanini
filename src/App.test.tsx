import type { ReactNode } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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

/** Requests counted per path — used by the R-FLT-05 clear assertions. */
function callCount(path: string): number {
  return fetchMock.mock.calls.filter(([url]) => String(url).includes(path))
    .length;
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

describe("Limpiar filtros — R-FLT-05 (App integration, ADR-3)", () => {
  const teamSticker = {
    id: 1,
    number: "001",
    name: "Lewandowski",
    positionId: 10,
    position: "Delantero",
    check: true,
    quantity: 1,
  };

  it("clears to the default album: drafts empty, applied null, ONE /teams refetch and ZERO new /stickers", async () => {
    useAuthStore.setState({ token: "stored-jwt", user: authedUser });
    fetchMock.mockImplementation((url: unknown) => {
      const target = String(url);
      if (target.includes("/teams")) {
        return Promise.resolve(
          jsonResponse(200, [
            { id: 1, name: "Barcelona", stickers: [teamSticker] },
          ]),
        );
      }
      if (target.includes("/positions")) {
        return Promise.resolve(
          jsonResponse(200, [{ id: 10, name: "Delantero" }]),
        );
      }
      if (target.includes("/stickers")) {
        return Promise.resolve(jsonResponse(200, [teamSticker]));
      }
      return Promise.resolve(jsonResponse(200, []));
    });

    renderApp("/stickers");

    // Default album renders from `['teams]` — no /stickers request yet.
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Barcelona" })).toBeTruthy(),
    );
    expect(callCount("/stickers")).toBe(0);

    fireEvent.change(screen.getByLabelText("Jugador"), {
      target: { value: "Lewandowski" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "Resultados filtrados" }),
      ).toBeTruthy(),
    );
    const teamsBefore = callCount("/teams");
    const stickersBefore = callCount("/stickers");
    expect(stickersBefore).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    await waitFor(() => expect(callCount("/teams")).toBe(teamsBefore + 1));
    expect(callCount("/stickers")).toBe(stickersBefore);
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Resultados filtrados" }),
      ).toBeNull(),
    );
    expect(screen.getByRole("heading", { name: "Barcelona" })).toBeTruthy();
    expect((screen.getByLabelText("Jugador") as HTMLInputElement).value).toBe(
      "",
    );
  });
});

describe("Global Crear sticker button — R-CRT-01 mount", () => {
  it("renders exactly ONE 'Crear sticker' button on authed /stickers", async () => {
    useAuthStore.setState({ token: "stored-jwt", user: authedUser });

    renderApp("/stickers");

    await waitFor(() => expect(currentPath()).toBe("/stickers"));
    expect(
      screen.getAllByRole("button", { name: "Crear sticker" }),
    ).toHaveLength(1);
  });

  it("renders no 'Crear sticker' button for guests on /login", async () => {
    renderApp("/login");

    await waitFor(() => expect(currentPath()).toBe("/login"));
    expect(screen.queryByRole("button", { name: "Crear sticker" })).toBeNull();
  });
});

describe("Create sticker flow — R-CRT-06/07 (App integration)", () => {
  const team = {
    id: 1,
    name: "Barcelona",
    stickers: [
      {
        id: 1,
        number: "001",
        name: "Lewandowski",
        positionId: 10,
        position: "Delantero",
        check: true,
        quantity: 1,
      },
    ],
  };
  const createdSticker = {
    id: 42,
    number: "007",
    name: "Lionel",
    positionId: 10,
    position: "Delantero",
    check: false,
    quantity: 0,
  };

  function stubAlbum(createStatus: number, createBody: unknown) {
    fetchMock.mockImplementation((url: unknown) => {
      const target = String(url);
      if (target.includes("/editions")) {
        return Promise.resolve(
          jsonResponse(200, [
            { id: 1, abbreviation: "1" },
            { id: 2, abbreviation: "2" },
            { id: 3, abbreviation: "3" },
          ]),
        );
      }
      if (target.includes("/stickers/create")) {
        return Promise.resolve(jsonResponse(createStatus, createBody));
      }
      if (target.includes("/teams")) {
        return Promise.resolve(jsonResponse(200, [team]));
      }
      if (target.includes("/positions")) {
        return Promise.resolve(
          jsonResponse(200, [{ id: 10, name: "Delantero" }]),
        );
      }
      return Promise.resolve(jsonResponse(200, []));
    });
  }

  async function openAndFill() {
    fireEvent.click(screen.getByRole("button", { name: "Crear sticker" }));
    const dialog = await screen.findByRole("dialog");
    const { getByLabelText } = within(dialog);
    await waitFor(() => expect(getByLabelText("Número")).toBeTruthy());

    fireEvent.change(getByLabelText("Número"), {
      target: { value: "007" },
    });
    fireEvent.change(getByLabelText("Nombre"), {
      target: { value: "Lionel" },
    });
    fireEvent.change(getByLabelText("Equipo"), {
      target: { value: "1" },
    });
    fireEvent.change(getByLabelText("Posición"), {
      target: { value: "10" },
    });
    fireEvent.change(getByLabelText("Edición"), {
      target: { value: "2" },
    });
  }

  it("invalidates ['teams], closes the modal and keeps the album mounted on 201 (no blank flash)", async () => {
    useAuthStore.setState({ token: "stored-jwt", user: authedUser });
    stubAlbum(201, createdSticker);

    renderApp("/stickers");
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Barcelona" })).toBeTruthy(),
    );
    const teamsBefore = callCount("/teams");

    await openAndFill();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(callCount("/stickers/create")).toBe(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // R-CRT-06: ['teams] is refetched after the create succeeds.
    await waitFor(() => expect(callCount("/teams")).toBe(teamsBefore + 1));
    // No blank flash — the useSuspenseQuery album keeps its prior data.
    expect(screen.getByRole("heading", { name: "Barcelona" })).toBeTruthy();
  });

  it("keeps the create modal open and surfaces a 400 through the global ErrorModal on top (R-CRT-07)", async () => {
    useAuthStore.setState({ token: "stored-jwt", user: authedUser });
    stubAlbum(400, {
      message: "Validation error",
      errors: {
        formErrors: [],
        fieldErrors: { body: ["positionId inválido"] },
      },
    });

    renderApp("/stickers");
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Barcelona" })).toBeTruthy(),
    );

    await openAndFill();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Global modal (z-50) opens with the normalized message…
    const error = await screen.findByRole("alertdialog");
    expect(error.textContent).toContain("positionId inválido");
    // …while the create dialog stays open with the typed values intact.
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect((screen.getByLabelText("Número") as HTMLInputElement).value).toBe(
      "007",
    );
  });
});
