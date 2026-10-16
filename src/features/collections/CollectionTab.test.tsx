import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CollectionTab from "./CollectionTab";
import { useCollectionStore } from "@/stores/collection";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

// id "2" is a STRING on purpose — R4 requires Number() coercion of both
// numeric and string ids from `GET /collection`.
const collections = [
  { id: 1, name: "Mundial 2022", completed: true },
  { id: "2", name: "Copa América" },
];

function renderTab() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<CollectionTab />, { wrapper: Wrapper });
}

function combobox(): HTMLSelectElement {
  return screen.getByRole("combobox", {
    name: "Colecciones",
  }) as HTMLSelectElement;
}

beforeEach(() => {
  useCollectionStore.setState({ collectionId: null });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(() =>
    Promise.resolve(jsonResponse(200, collections)),
  );
});

describe("CollectionTab — T8 interactive collection filter", () => {
  it("T1: renders ONE select-sized skeleton ghost (no combobox) while /collection suspends", () => {
    // A never-resolving fetch keeps the component suspended → fallback visible.
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));

    renderTab();

    const skeleton = screen.getByTestId("collection-tab-skeleton");
    expect(skeleton.getAttribute("aria-hidden")).toBe("true");
    // Exactly ONE ghost child matching the real select anatomy (R6).
    expect(skeleton.children).toHaveLength(1);
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("T2: shows the FIRST collection as value while the store stays null — no seeding (R1, R3)", async () => {
    renderTab();

    await waitFor(() => expect(screen.getByRole("combobox")).toBeTruthy());

    const select = combobox();
    expect(select).toBeInstanceOf(HTMLSelectElement);
    // Derived default: effective id 1 is displayed, but never written to the store.
    expect(select.value).toBe("1");
    expect(useCollectionStore.getState().collectionId).toBeNull();
  });

  it("T3: publishes a numeric collection id on change — string ids coerced (R4)", async () => {
    renderTab();
    await waitFor(() => expect(screen.getByRole("combobox")).toBeTruthy());

    fireEvent.change(combobox(), { target: { value: "2" } });

    await waitFor(() =>
      expect(useCollectionStore.getState().collectionId).toBe(2),
    );
    expect(combobox().value).toBe("2");
  });

  it("T4: carries the pill styling classes and keeps them after a change (R2)", async () => {
    renderTab();
    await waitFor(() => expect(screen.getByRole("combobox")).toBeTruthy());

    const select = combobox();
    for (const token of [
      "h-9",
      "rounded-full",
      "bg-primary",
      "text-primary-foreground",
      "font-bold",
    ]) {
      expect(select.className).toContain(token);
    }

    fireEvent.change(select, { target: { value: "2" } });
    await waitFor(() => expect(combobox().value).toBe("2"));
    // Closed control stays blue/white after the interaction (R2).
    expect(combobox().className).toContain("bg-primary");
    expect(combobox().className).toContain("text-primary-foreground");
  });

  it("T5: shows '(Completada)' as option-text suffix and no badge spans (R5)", async () => {
    renderTab();
    await waitFor(() => expect(screen.getByRole("combobox")).toBeTruthy());

    const options = screen.getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Mundial 2022 (Completada)",
      "Copa América",
    ]);
    // The closed control shows the selected option's suffixed text too.
    expect(combobox().selectedOptions[0].text).toContain("(Completada)");
    // The decorative badge <span> from the old strip is gone (zero matches).
    expect(screen.queryAllByText("Completada")).toHaveLength(0);
    expect(combobox().querySelectorAll("span")).toHaveLength(0);
  });

  it("T6: renders a muted empty state and leaves the selection null when there are no collections (R1)", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, [])));

    renderTab();

    await waitFor(() =>
      expect(screen.getByText("No hay colecciones")).toBeTruthy(),
    );
    // No dead control for an empty list — and nothing to auto-select.
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(useCollectionStore.getState().collectionId).toBeNull();
  });

  it("T7: an empty change value never reaches the store — Number('') === 0 trap (R4)", async () => {
    renderTab();
    await waitFor(() => expect(screen.getByRole("combobox")).toBeTruthy());

    fireEvent.change(combobox(), { target: { value: "" } });

    // Proves neither 0 nor NaN was published: the store keeps its null default.
    expect(useCollectionStore.getState().collectionId).toBeNull();
  });
});
