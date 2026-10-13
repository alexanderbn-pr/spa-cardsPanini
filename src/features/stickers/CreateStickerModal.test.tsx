import { useState } from "react";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateStickerModal from "./CreateStickerModal";

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

/**
 * Mirrors the real consumer (`CreateStickerButton`): the trigger owns the
 * `open` state and the modal is mounted only while open. `onClose` is observed
 * so dismissal can be asserted independently of the unmount.
 */
function Harness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
        }}
      >
        abrir
      </button>
      {open ? (
        <CreateStickerModal
          onClose={() => {
            onClose();
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function renderModal() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onClose = vi.fn();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  render(
    <Wrapper>
      <Harness onClose={onClose} />
    </Wrapper>,
  );
  return { onClose };
}

/** Opens the modal from its trigger and waits for the (suspending) form. */
async function openModal() {
  fireEvent.click(screen.getByRole("button", { name: "abrir" }));
  const dialog = await screen.findByRole("dialog");
  await waitFor(() => expect(screen.getByLabelText("Número")).toBeTruthy());
  return dialog;
}

beforeEach(() => {
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
    return Promise.resolve(jsonResponse(200, []));
  });
});

describe("CreateStickerModal — R-CRT-02 dialog semantics", () => {
  it("renders a labelled modal dialog (role=dialog, aria-modal, heading)", async () => {
    renderModal();
    const dialog = await openModal();

    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("create-sticker-title");
    expect(screen.getByRole("heading", { name: "Crear sticker" })).toBeTruthy();
  });
});

describe("CreateStickerModal — R-CRT-02 dismissal", () => {
  it("closes on a backdrop click but stays open when the panel itself is clicked", async () => {
    const { onClose } = renderModal();
    await openModal();

    // Inner click — the panel stops propagation, so nothing closes.
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();

    // Backdrop click — the overlay handler closes the dialog.
    fireEvent.click(screen.getByTestId("create-sticker-backdrop"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", async () => {
    const { onClose } = renderModal();
    await openModal();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("CreateStickerModal — R-CRT-02 focus & scroll floor", () => {
  it("focuses the first field on open and restores focus to the trigger on close", async () => {
    renderModal();
    const trigger = screen.getByRole("button", { name: "abrir" });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    await openModal();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText("Número")),
    );

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("locks body scroll while open and restores it on close", async () => {
    const previous = document.body.style.overflow;
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "abrir" }));
    await waitFor(() => expect(document.body.style.overflow).toBe("hidden"));

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.body.style.overflow).toBe(previous);
  });
});
