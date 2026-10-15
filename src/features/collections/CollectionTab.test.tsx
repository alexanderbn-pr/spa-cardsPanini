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

const collections = [
  { id: 1, name: "Mundial 2022", completed: true },
  { id: 2, name: "Copa América" },
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

function pillFor(name: string): HTMLButtonElement {
  return screen.getByText(name).closest("button") as HTMLButtonElement;
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
  it("renders a skeleton inside its own Suspense boundary instead of a blank frame while /collection loads", () => {
    // A never-resolving fetch keeps the component suspended → fallback visible.
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));

    renderTab();

    expect(screen.getByTestId("collection-tab-skeleton")).toBeTruthy();
  });

  it("derives the FIRST collection on load — the store stays null while the first tab renders selected", async () => {
    renderTab();

    await waitFor(() => expect(screen.getByText("Mundial 2022")).toBeTruthy());

    const first = pillFor("Mundial 2022");
    expect(first.getAttribute("aria-pressed")).toBe("true");
    expect(first.className).toContain("font-bold");
    expect(first.className).toContain("underline");
    // No explicit selection was made — the store keeps its null default.
    expect(useCollectionStore.getState().collectionId).toBeNull();
  });

  it("publishes the clicked collection id to the store and marks it selected", async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText("Mundial 2022")).toBeTruthy());

    // Derived default: the first collection is selected before any click.
    expect(pillFor("Mundial 2022").getAttribute("aria-pressed")).toBe("true");
    expect(pillFor("Copa América").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(pillFor("Copa América"));

    await waitFor(() =>
      expect(useCollectionStore.getState().collectionId).toBe(2),
    );
    expect(pillFor("Copa América").getAttribute("aria-pressed")).toBe("true");
    expect(pillFor("Mundial 2022").getAttribute("aria-pressed")).toBe("false");
  });

  it("styles the selected tab bold + underlined and leaves the others muted", async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText("Mundial 2022")).toBeTruthy());

    const selected = pillFor("Mundial 2022");
    const other = pillFor("Copa América");

    expect(selected.className).toContain("font-bold");
    expect(selected.className).toContain("underline");
    expect(other.className).not.toContain("font-bold");
    expect(other.className).toContain("text-muted-foreground");
  });

  it("shows a completed indicator only when completed === true", async () => {
    renderTab();

    await waitFor(() => expect(screen.getByText("Mundial 2022")).toBeTruthy());
    // Exactly one completed badge — bound to the one completed collection.
    expect(screen.getAllByText("Completada")).toHaveLength(1);
  });

  it("renders a muted empty state and leaves the selection null when there are no collections", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, [])));

    renderTab();

    await waitFor(() =>
      expect(screen.getByText("No hay colecciones")).toBeTruthy(),
    );
    // Nothing to auto-select → the store stays at its null default.
    expect(useCollectionStore.getState().collectionId).toBeNull();
  });
});
