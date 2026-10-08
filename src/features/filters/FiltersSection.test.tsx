import { useState } from "react";
import type { ReactNode } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FiltersSection from "./FiltersSection";
import type { AppliedFilters } from "@/types/filters";
import { useStickersQuery } from "@/hooks/useStickersQuery";
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

const teams: Team[] = [
  { id: 1, name: "Barcelona", stickers: [] },
  { id: 2, name: "Real Madrid", stickers: [] },
];
const positions = [
  { id: 10, name: "Delantero" },
  { id: 11, name: "Portero" },
];
const sticker: Sticker = {
  id: 1,
  number: "001",
  name: "Lewandowski",
  positionId: 10,
  position: "Delantero",
  check: true,
  quantity: 1,
};

/**
 * Mirrors App's wiring (design §5): `applied` lifted to the parent, the album
 * side driven by `useStickersQuery(applied)` — the exact hook MainScreen uses.
 */
function AlbumProbe({ applied }: { applied: AppliedFilters | null }) {
  useStickersQuery(applied);
  return null;
}

function Harness({ onApply }: { onApply?: (next: AppliedFilters) => void }) {
  const [applied, setApplied] = useState<AppliedFilters | null>(null);

  function handleApply(next: AppliedFilters) {
    onApply?.(next);
    setApplied(next);
  }

  return (
    <>
      <FiltersSection applied={applied} onApply={handleApply} />
      <AlbumProbe applied={applied} />
    </>
  );
}

const onApply = vi.fn();

function renderSection() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <Wrapper>
      <Harness onApply={onApply} />
    </Wrapper>,
  );
}

function stickerUrls(): string[] {
  return fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.includes("/stickers"));
}

async function waitForControls() {
  // The controls suspend on ['teams] + ['positions] — resolve before interacting.
  await waitFor(() => expect(screen.getByLabelText("Equipo")).toBeTruthy());
}

beforeEach(() => {
  onApply.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation((url: unknown) => {
    const target = String(url);
    if (target.includes("/teams")) {
      return Promise.resolve(jsonResponse(200, teams));
    }
    if (target.includes("/positions")) {
      return Promise.resolve(jsonResponse(200, positions));
    }
    if (target.includes("/stickers")) {
      return Promise.resolve(jsonResponse(200, [sticker]));
    }
    return Promise.resolve(jsonResponse(200, []));
  });
});

describe("FiltersSection — R-FLT-01 controls populated from ['teams] and ['positions]", () => {
  it("lists every team name and position name in the selects, plus the remaining controls", async () => {
    renderSection();
    await waitForControls();

    expect(
      within(screen.getByLabelText("Equipo"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Todos", "Barcelona", "Real Madrid"]);
    expect(
      within(screen.getByLabelText("Posición"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Todos", "Delantero", "Portero"]);

    expect(screen.getByLabelText("Jugador")).toBeTruthy();
    expect(screen.getByLabelText("Estado")).toBeTruthy();
    expect(screen.getByLabelText("Repetidos")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Aplicar filtros" }),
    ).toBeTruthy();
  });
});

describe("FiltersSection — R-FLT-02 apply on click only", () => {
  it("typing and toggling WITHOUT clicking 'Aplicar filtros' issues ZERO /stickers requests", async () => {
    renderSection();
    await waitForControls();

    fireEvent.change(screen.getByLabelText("Jugador"), {
      target: { value: "Lewandowski" },
    });
    fireEvent.click(screen.getByLabelText("Repetidos"));

    // WHY: drafts are local state — no query key change, no request, nothing lifted.
    expect(stickerUrls()).toHaveLength(0);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("clicking 'Aplicar filtros' lifts the drafts and fires exactly ONE /stickers request with them", async () => {
    renderSection();
    await waitForControls();

    fireEvent.change(screen.getByLabelText("Jugador"), {
      target: { value: "Lewandowski" },
    });
    fireEvent.change(screen.getByLabelText("Equipo"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "true" },
    });
    fireEvent.click(screen.getByLabelText("Repetidos"));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({
      name: "Lewandowski",
      teamId: "1",
      check: true,
      repetidos: true,
    });

    // The stubbed page returns 1 row (< limit 100) → the page-loop stops at ONE call.
    await waitFor(() => expect(stickerUrls()).toHaveLength(1));
    const [url] = stickerUrls();
    expect(url).toContain("/stickers?");
    expect(url).toContain("page=0");
    expect(url).toContain("limit=100");
    expect(url).toContain("teamId=1");
    expect(url).toContain("check=true");
    expect(url).toContain("name=Lewandowski");
    // TRAP (R-FLT-04): repetidos is a CLIENT-SIDE quantity>1 predicate — the API
    // `quantity` param is exact-match only, so it must never appear in the URL.
    expect(url).not.toContain("quantity=");
  });
});
