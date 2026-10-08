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

function renderFiltered(stickers: Sticker[], repetidos: boolean) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <Wrapper>
      <StickerList stickers={stickers} repetidos={repetidos} />
    </Wrapper>,
  );
}

/** Results straight from a /stickers page-loop: quantities 0, 1, 2, 3. */
const filteredResults: Sticker[] = [
  makeQuantitySticker(1, 0),
  makeQuantitySticker(2, 1),
  makeQuantitySticker(3, 2),
  makeQuantitySticker(4, 3),
];

function visibleCardLabels(): (string | null)[] {
  return screen
    .getAllByRole("button")
    .map((el) => el.getAttribute("aria-label"))
    .filter((label): label is string => label?.startsWith("Sticker ") ?? false);
}

describe("StickerList filtered view — R-FLT-04 repetidos = CLIENT-SIDE quantity > 1", () => {
  it("displays ONLY stickers with quantity > 1 when repetidos is applied (the API quantity param is exact-match, no gt)", () => {
    renderFiltered(filteredResults, true);

    // WHY: 0/1 are single copies, 2/3 are "repetidos" — the predicate runs on
    // the client because the API cannot express quantity > 1.
    expect(visibleCardLabels()).toEqual(["Sticker 003 S3", "Sticker 004 S4"]);
  });

  it("displays the full result set when repetidos is NOT applied", () => {
    renderFiltered(filteredResults, false);

    expect(visibleCardLabels()).toEqual([
      "Sticker 001 S1",
      "Sticker 002 S2",
      "Sticker 003 S3",
      "Sticker 004 S4",
    ]);
  });

  it("renders an explicit empty state instead of a blank frame when the predicate matches nothing", () => {
    renderFiltered([makeQuantitySticker(1, 0)], true);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText(/Sin resultados/)).toBeTruthy();
  });
});
