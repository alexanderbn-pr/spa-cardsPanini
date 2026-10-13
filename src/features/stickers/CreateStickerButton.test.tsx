import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateStickerButton from "./CreateStickerButton";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

const teams = [{ id: 1, name: "Barcelona", stickers: [] }];
const positions = [{ id: 10, name: "Delantero" }];
const createdSticker = {
  id: 42,
  number: "007",
  name: "Lionel",
  positionId: 10,
  position: "Delantero",
  check: false,
  quantity: 0,
};

function createCalls(): Array<[string, RequestInit]> {
  return fetchMock.mock.calls.filter(([url]) =>
    String(url).includes("/stickers/create"),
  ) as Array<[string, RequestInit]>;
}

function renderButton() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  render(<CreateStickerButton />, { wrapper: Wrapper });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
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
      return Promise.resolve(jsonResponse(201, createdSticker));
    }
    if (target.includes("/teams")) {
      return Promise.resolve(jsonResponse(200, teams));
    }
    if (target.includes("/positions")) {
      return Promise.resolve(jsonResponse(200, positions));
    }
    return Promise.resolve(jsonResponse(200, []));
  });
});

describe("CreateStickerButton — R-CRT-01 trigger", () => {
  it("renders the 'Crear sticker' button and opens the modal on click", async () => {
    renderButton();

    const trigger = screen.getByRole("button", { name: "Crear sticker" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    await waitFor(() => expect(screen.getByLabelText("Número")).toBeTruthy());
  });
});

describe("CreateStickerButton — R-CRT-06 close on success", () => {
  it("closes the modal after the create request resolves with 201", async () => {
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: "Crear sticker" }));
    await screen.findByRole("dialog");
    await waitFor(() => expect(screen.getByLabelText("Número")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Número"), {
      target: { value: "007" },
    });
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Lionel" },
    });
    fireEvent.change(screen.getByLabelText("Equipo"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Posición"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Edición"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(createCalls()).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // The trigger is still on the page after the success path closes the modal.
    expect(screen.getByRole("button", { name: "Crear sticker" })).toBeTruthy();
  });
});
