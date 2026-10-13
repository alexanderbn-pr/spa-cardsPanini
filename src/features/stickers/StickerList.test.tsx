import type { ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MainScreen from "./MainScreen";
import StickerList from "./StickerList";
import type { Sticker, Team } from "@/types/api";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

function makeSticker(id: number, check: boolean): Sticker {
  return {
    id,
    number: String(id).padStart(3, "0"),
    name: `Nombre ${id}`,
    positionId: null,
    position: null,
    check,
    quantity: check ? 1 : 0,
  };
}

/** Deliberately shuffled numbers → the grid must re-order them (R-ALB-04). */
const teams: Team[] = [
  {
    id: 1,
    name: "Atlético",
    stickers: [
      makeSticker(3, true),
      makeSticker(1, false),
      makeSticker(2, true),
    ],
  },
];

function renderMain() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <Wrapper>
      <MainScreen />
    </Wrapper>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(jsonResponse(200, teams));
});

describe("MainScreen/StickerList — R-ALB-01/04 grouped default view", () => {
  it("renders team sections with the teams-derived percentage and NEVER calls /stickers (RK-2)", async () => {
    renderMain();

    // WHY: bare /stickers arrays carry no totals — everything must come from
    // the single GET /teams response until WU4 filters are applied.
    await waitFor(() => expect(screen.getByText("Atlético")).toBeTruthy());
    // The fraction appears in BOTH the bar and the team header → scope the
    // R-ALB-01 assertion to the percentage section only.
    const bar = screen.getByLabelText("Progreso de la colección");
    expect(within(bar).getByText("2/3")).toBeTruthy();

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes("/teams"))).toBe(true);
    expect(urls.every((url) => !url.includes("/stickers"))).toBe(true);
  });

  it("orders the cards by number ascending (001, 002, 003) regardless of server order", async () => {
    renderMain();

    await waitFor(() => expect(screen.getByText("Atlético")).toBeTruthy());
    const cardLabels = screen
      .getAllByRole("button")
      .map((el) => el.getAttribute("aria-label"))
      .filter(
        (label): label is string => label?.startsWith("Sticker ") ?? false,
      );

    expect(cardLabels).toEqual([
      "Sticker 001 Nombre 1",
      "Sticker 002 Nombre 2",
      "Sticker 003 Nombre 3",
    ]);
  });
});

function makeQuantitySticker(id: number, quantity: number): Sticker {
  return {
    id,
    number: String(id).padStart(3, "0"),
    name: `S${id}`,
    positionId: null,
    position: null,
    check: quantity >= 1,
    quantity,
  };
}

function renderFiltered(
  stickers: Sticker[],
  repetidos: boolean,
  teams: Team[],
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <Wrapper>
      <StickerList teams={teams} stickers={stickers} repetidos={repetidos} />
    </Wrapper>,
  );
}

/**
 * ADR-2 spine — SERVER order [Atlético, Barcelona, Real Madrid]. `/stickers`
 * rows carry NO `teamId`; the sticker `id` is the shared identity with the
 * `['teams]` cache (the same join `usePatchSticker.writeSticker` performs).
 * Inner sticker order is deliberately scrambled → grids must re-sort.
 */
const groupedTeams: Team[] = [
  {
    id: 1,
    name: "Atlético",
    stickers: [
      makeQuantitySticker(3, 2),
      makeQuantitySticker(1, 0),
      makeQuantitySticker(2, 1),
      makeQuantitySticker(4, 3),
    ],
  },
  {
    id: 2,
    name: "Barcelona",
    stickers: [makeQuantitySticker(6, 1), makeQuantitySticker(5, 0)],
  },
  {
    id: 3,
    name: "Real Madrid",
    stickers: [makeQuantitySticker(8, 1), makeQuantitySticker(7, 0)],
  },
];

/** Results straight from a /stickers page-loop: quantities 0, 1, 2, 3. */
const filteredResults: Sticker[] = [
  makeQuantitySticker(1, 0),
  makeQuantitySticker(2, 1),
  makeQuantitySticker(3, 2),
  makeQuantitySticker(4, 3),
];

/** Team sections in render order — `[Equipo X, Equipo Y]` proves the /teams spine. */
function teamSectionLabels(): (string | null)[] {
  return screen
    .queryAllByRole("region")
    .map((el) => el.getAttribute("aria-label"))
    .filter((label) => label?.startsWith("Equipo ") ?? false);
}

function cardLabelsIn(container: HTMLElement): (string | null)[] {
  return within(container)
    .getAllByRole("button")
    .map((el) => el.getAttribute("aria-label"))
    .filter((label): label is string => label?.startsWith("Sticker ") ?? false);
}

describe("StickerList filtered view — R-FLT-06 grouped join onto /teams (ADR-2)", () => {
  it("renders matched sections in /teams order, hides zero-match teams, keeps FULL header counts and sorts each grid", () => {
    // Matched ids {1,4,5,6} + id 99 which is ABSENT from /teams (drift → dropped).
    renderFiltered(
      [
        makeQuantitySticker(5, 0),
        makeQuantitySticker(1, 0),
        makeQuantitySticker(6, 1),
        makeQuantitySticker(4, 3),
        makeQuantitySticker(99, 1),
      ],
      false,
      groupedTeams,
    );

    // Landmark kept + sections follow the SERVER order; Real Madrid (zero
    // matches) is HIDDEN while the survivors keep their exact relative order.
    const regionLabels = screen
      .getAllByRole("region")
      .map((el) => el.getAttribute("aria-label"));
    expect(regionLabels).toContain("Resultados filtrados");
    expect(teamSectionLabels()).toEqual([
      "Equipo Atlético",
      "Equipo Barcelona",
    ]);

    const atletico = screen.getByRole("region", { name: "Equipo Atlético" });
    // R-ALB-02: header keeps the FULL-team fraction (3 of 4 checked), NOT the subset.
    expect(within(atletico).getByText("3/4")).toBeTruthy();
    // Grid = only the 2 matches, sorted 001 → 004 by compareStickerNumber.
    expect(cardLabelsIn(atletico)).toEqual([
      "Sticker 001 S1",
      "Sticker 004 S4",
    ]);

    const barcelona = screen.getByRole("region", { name: "Equipo Barcelona" });
    expect(within(barcelona).getByText("1/2")).toBeTruthy();
    expect(cardLabelsIn(barcelona)).toEqual([
      "Sticker 005 S5",
      "Sticker 006 S6",
    ]);

    // Drift guard: a matched row with no /teams counterpart is dropped — no flat fallback.
    expect(screen.queryByText("099")).toBeNull();
  });

  it("applies the repetidos quantity > 1 predicate CLIENT-SIDE before the join (R-FLT-04)", () => {
    renderFiltered(filteredResults, true, groupedTeams);

    // WHY: the API quantity param is exact-match (no gt) → predicate runs here.
    // matched = {3,4} → only Atlético survives; its header STILL shows 3/4.
    expect(teamSectionLabels()).toEqual(["Equipo Atlético"]);
    const atletico = screen.getByRole("region", { name: "Equipo Atlético" });
    expect(within(atletico).getByText("3/4")).toBeTruthy();
    expect(cardLabelsIn(atletico)).toEqual([
      "Sticker 003 S3",
      "Sticker 004 S4",
    ]);
  });

  it("displays the full result set when repetidos is NOT applied", () => {
    renderFiltered(filteredResults, false, groupedTeams);

    expect(teamSectionLabels()).toEqual(["Equipo Atlético"]);
    expect(
      cardLabelsIn(screen.getByRole("region", { name: "Equipo Atlético" })),
    ).toEqual([
      "Sticker 001 S1",
      "Sticker 002 S2",
      "Sticker 003 S3",
      "Sticker 004 S4",
    ]);
  });

  it("renders an explicit empty state instead of a blank frame when the predicate matches nothing", () => {
    renderFiltered([makeQuantitySticker(1, 0)], true, groupedTeams);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText(/Sin resultados/)).toBeTruthy();
    expect(teamSectionLabels()).toEqual([]);
  });
});
