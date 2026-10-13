import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StickerCard from "./StickerCard";
import { useTeamsQuery } from "@/hooks/useTeamsQuery";
import { queryKeys } from "@/lib/api/keys";
import { useUiStore } from "@/stores/ui";
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

function makeSticker(overrides: Partial<Sticker> = {}): Sticker {
  return {
    id: 10,
    number: "001",
    name: "Lionel Messi",
    positionId: null,
    position: null,
    check: true,
    quantity: 2,
    ...overrides,
  };
}

function teamsWith(sticker: Sticker): Team[] {
  return [{ id: 1, name: "Equipazo", stickers: [sticker] }];
}

/**
 * The card is a presentational child of TeamSection — its props flow from the
 * `['teams]` cache in the real app, so the harness mirrors that wiring:
 * optimistic write-through updates the cache → harness re-renders the card
 * with the new sticker. staleTime Infinity keeps mount from firing a GET.
 */
function renderCard(overrides: Partial<Sticker> = {}) {
  const sticker = makeSticker(overrides);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(queryKeys.teams, teamsWith(sticker));

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  function CardHarness() {
    const { data: teams } = useTeamsQuery();
    const current = teams
      .flatMap((team) => team.stickers)
      .find((item) => item.id === sticker.id);
    if (current === undefined) return null;
    return <StickerCard sticker={current} />;
  }

  return render(
    <Wrapper>
      <CardHarness />
    </Wrapper>,
  );
}

/** PATCH answers vs. /teams refetch (rollback invalidation) — routed by method. */
function routeFetch(patchResponse: Response) {
  fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
    init?.method === "PATCH"
      ? patchResponse
      : jsonResponse(200, teamsWith(makeSticker())),
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  useUiStore.setState({ errorMessages: null });
});

describe("StickerCard — R-ALB-04 green border comes from the SERVER's check field", () => {
  it("carries the green border IFF check === true, and no other card state implies it", () => {
    const checked = renderCard({ check: true });
    expect(
      screen.getByRole("button", { name: "Sticker 001 Lionel Messi" })
        .className,
    ).toContain("border-success");
    checked.unmount();

    renderCard({ check: false, quantity: 0 });
    expect(
      screen.getByRole("button", { name: "Sticker 001 Lionel Messi" })
        .className,
    ).not.toContain("border-success");
  });

  it("shows number, name and the quantity chip as-is (zero-padded string preserved)", () => {
    renderCard({ number: "007", quantity: 3 });

    expect(screen.getByText("007")).toBeTruthy();
    expect(screen.getByText("Lionel Messi")).toBeTruthy();
    expect(screen.getByText("×3")).toBeTruthy();
  });
});

describe("StickerCard — R-INT-02 trash visibility and decrement", () => {
  it("renders the trash button IFF quantity > 1", () => {
    renderCard({ quantity: 3, check: true });

    expect(
      screen.getByRole("button", { name: "Eliminar sticker" }),
    ).toBeTruthy();
  });

  it("has no trash button when quantity is 1, so a lone copy cannot be trashed", () => {
    renderCard({ quantity: 1, check: true });

    expect(
      screen.queryByRole("button", { name: "Eliminar sticker" }),
    ).toBeNull();
  });

  it("sends PATCH {delta:-1} for the sticker id when trash is clicked", async () => {
    routeFetch(jsonResponse(200, makeSticker({ quantity: 2, check: true })));
    renderCard({ quantity: 3, check: true });

    fireEvent.click(screen.getByRole("button", { name: "Eliminar sticker" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/stickers/10");
    expect(init.method).toBe("PATCH");
    // Server ownership: body is {delta} ONLY — no check, no quantity (R-INT-03).
    expect(JSON.parse(String(init.body))).toEqual({ delta: -1 });
  });
});

describe("StickerCard — R-INT-01 optimistic +1 with rollback on failure", () => {
  it("optimistically shows the new quantity before the response, sends {delta:1} only, then rolls back and surfaces the modal error when the server rejects", async () => {
    let resolveFetch!: (response: Response) => void;
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method !== "PATCH") {
        return jsonResponse(200, teamsWith(makeSticker()));
      }
      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    });
    renderCard({ quantity: 2, check: true });

    fireEvent.click(screen.getByRole("button", { name: /001/ }));

    // Pending request → the ×3 on screen can ONLY be the optimistic write-through.
    await waitFor(() => expect(screen.getByText("×3")).toBeTruthy());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ delta: 1 });

    resolveFetch(
      jsonResponse(500, {
        message: "boom",
        errors: { formErrors: [], fieldErrors: { body: [] } },
      }),
    );

    // Rollback restores the pre-click quantity AND the error reaches the ui-store modal.
    await waitFor(() => expect(screen.getByText("×2")).toBeTruthy());
    expect(useUiStore.getState().errorMessages).not.toBeNull();
  });

  it("keeps the increment on success — the cache ends at the authoritative server values", async () => {
    routeFetch(jsonResponse(200, makeSticker({ quantity: 5, check: true })));
    renderCard({ quantity: 2, check: true });

    fireEvent.click(screen.getByRole("button", { name: /001/ }));

    await waitFor(() => expect(screen.getByText("×5")).toBeTruthy());
  });
});
