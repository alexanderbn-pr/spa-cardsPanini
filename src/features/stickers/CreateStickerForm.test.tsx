import { Suspense } from "react";
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
import CreateStickerForm from "./CreateStickerForm";

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

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onCreated = vi.fn();
  const onCancel = vi.fn();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <Suspense fallback={<div>Cargando…</div>}>{children}</Suspense>
    </QueryClientProvider>
  );
  render(<CreateStickerForm onCreated={onCreated} onCancel={onCancel} />, {
    wrapper: Wrapper,
  });
  return { onCreated, onCancel, client };
}

async function waitForForm() {
  // The selects suspend on ['teams] + ['positions] — resolve before interacting.
  await waitFor(() => expect(screen.getByLabelText("Equipo")).toBeTruthy());
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

describe("CreateStickerForm — R-CRT-03 defaults & options", () => {
  it("starts empty with quantity 0 / check false and fills the selects from the caches", async () => {
    renderForm();
    await waitForForm();

    expect((screen.getByLabelText("Número") as HTMLInputElement).value).toBe(
      "",
    );
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe(
      "",
    );
    expect((screen.getByLabelText("Equipo") as HTMLSelectElement).value).toBe(
      "",
    );
    expect((screen.getByLabelText("Posición") as HTMLSelectElement).value).toBe(
      "",
    );
    // Edición also starts empty / Todos.
    expect((screen.getByLabelText("Edición") as HTMLSelectElement).value).toBe(
      "",
    );

    expect(
      within(screen.getByLabelText("Equipo"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Selecciona equipo", "Barcelona"]);
    expect(
      within(screen.getByLabelText("Posición"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Selecciona posición", "Delantero"]);
    expect(
      within(screen.getByLabelText("Edición"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Selecciona edición", "1", "2", "3"]);
  });
});

describe("CreateStickerForm — R-CRT-04 validation policy", () => {
  it("keeps Save disabled until number, name, idTeam, positionId and editionId are all non-empty", async () => {
    renderForm();
    await waitForForm();

    const save = () => screen.getByRole("button", { name: "Guardar" });
    expect((save() as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Número"), {
      target: { value: "007" },
    });
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Lionel" },
    });
    // Still missing both FK selects and edition.
    expect((save() as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Equipo"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Posición"), {
      target: { value: "10" },
    });
    // Select an edition to enable Save.
    fireEvent.change(screen.getByLabelText("Edición"), {
      target: { value: "2" },
    });
    expect((save() as HTMLButtonElement).disabled).toBe(false);
  });

  it("renders per-field role=alert errors on submit with required fields empty and fires ZERO create requests", async () => {
    renderForm();
    await waitForForm();

    fireEvent.submit(screen.getByRole("form", { name: "Crear sticker" }));

    await waitFor(() =>
      expect(screen.getByText("El número es obligatorio")).toBeTruthy(),
    );
    expect(screen.getByText("El nombre es obligatorio")).toBeTruthy();
    expect(screen.getByText("Selecciona un equipo")).toBeTruthy();
    expect(screen.getByText("Selecciona una posición")).toBeTruthy();
    expect(screen.getByText("Selecciona una edición")).toBeTruthy();
    expect(screen.getAllByRole("alert")).toHaveLength(5);

    // R-CRT-04: invalid fires NO request (mutation never called).
    expect(createCalls()).toHaveLength(0);
  });
});

describe("CreateStickerForm — R-CRT-05 valid submit", () => {
  it("submits the coerced {sticker, idTeam, editionId} body keeping number a string, then calls onCreated", async () => {
    const { onCreated } = renderForm();
    await waitForForm();

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

    const [, init = {} as RequestInit] = createCalls()[0];
    expect(JSON.parse(init.body as string)).toEqual({
      sticker: {
        number: "007",
        name: "Lionel",
        positionId: 10,
        quantity: 0,
        check: false,
        editionId: "2",
      },
      idTeam: 1,
    });

    // Success closes via the caller's callback.
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  });

  it("disables Save and relabels it while the mutation is pending (R-CRT-07 duplicate prevention)", async () => {
    renderForm();
    await waitForForm();

    let resolveCreate!: (response: Response) => void;
    fetchMock.mockImplementation((url: unknown) => {
      const target = String(url);
      if (target.includes("/stickers/create")) {
        return new Promise<Response>((resolve) => {
          resolveCreate = resolve;
        });
      }
      if (target.includes("/teams")) {
        return Promise.resolve(jsonResponse(200, teams));
      }
      return Promise.resolve(jsonResponse(200, positions));
    });

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

    // Pending → the button flips to a disabled "Creando…" so it can't fire twice.
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Creando…" }) as HTMLButtonElement)
          .disabled,
      ).toBe(true),
    );
    expect(createCalls()).toHaveLength(1);

    resolveCreate(jsonResponse(201, createdSticker));
  });
});
