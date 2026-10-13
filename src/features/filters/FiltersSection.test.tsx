import { useState } from "react";
import type { ReactNode } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FiltersSection from "./FiltersSection";
import type { AppliedFilters } from "@/types/filters";
import { useStickersQuery } from "@/hooks/useStickersQuery";
import { queryKeys } from "@/lib/api/keys";
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
 * The probe reports which album branch is mounted so "clear → album view" is
 * observable.
 */
function AlbumProbe({ applied }: { applied: AppliedFilters | null }) {
  useStickersQuery(applied);
  return (
    <div data-testid="album">
      {applied === null ? "vista por equipos" : "vista filtrada"}
    </div>
  );
}

function Harness({
  onApply,
  onClear,
}: {
  onApply?: (next: AppliedFilters) => void;
  onClear?: () => void;
}) {
  const [applied, setApplied] = useState<AppliedFilters | null>(null);
  const queryClient = useQueryClient();

  function handleApply(next: AppliedFilters) {
    onApply?.(next);
    setApplied(next);
  }

  /** Mirrors App's `handleClear` (ADR-3): drop the key + refetch `/teams` only. */
  function handleClear() {
    onClear?.();
    setApplied(null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.teams });
  }

  return (
    <>
      <FiltersSection
        applied={applied}
        onApply={handleApply}
        onClear={handleClear}
      />
      <AlbumProbe applied={applied} />
      <output data-testid="applied-state">
        {applied === null ? "null" : "set"}
      </output>
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

function teamsUrls(): string[] {
  return fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.includes("/teams"));
}

function inputValue(label: string): string {
  return (screen.getByLabelText(label) as HTMLInputElement).value;
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

describe("FiltersSection — R-FLT-05 Limpiar filtros (ADR-3)", () => {
  it("empties the drafts, drops applied to null (album returns), fires exactly ONE /teams refetch and ZERO new /stickers", async () => {
    renderSection();
    await waitForControls();

    // Apply first so a filtered view + exactly ONE /stickers request exist.
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

    await waitFor(() => expect(stickerUrls()).toHaveLength(1));
    expect(screen.getByTestId("applied-state").textContent).toBe("set");
    expect(screen.getByTestId("album").textContent).toBe("vista filtrada");

    const teamsBefore = teamsUrls().length;
    const stickersBefore = stickerUrls().length;

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    // S1 — drafts empty, applied null, default album view renders.
    await waitFor(() => expect(inputValue("Jugador")).toBe(""));
    expect(inputValue("Equipo")).toBe("");
    expect(inputValue("Posición")).toBe("");
    expect(inputValue("Estado")).toBe("");
    expect(
      (screen.getByLabelText("Repetidos") as HTMLInputElement).checked,
    ).toBe(false);
    expect(screen.getByTestId("applied-state").textContent).toBe("null");
    expect(screen.getByTestId("album").textContent).toBe("vista por equipos");

    // S2 — exactly ONE `/teams` refetch, ZERO new `/stickers` requests.
    await waitFor(() => expect(teamsUrls()).toHaveLength(teamsBefore + 1));
    expect(stickerUrls()).toHaveLength(stickersBefore);
  });
});
