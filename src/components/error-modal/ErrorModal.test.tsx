import { render, screen, fireEvent } from "@testing-library/react";
import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ErrorModal from "./ErrorModal";
import { apiFetch } from "@/lib/api/client";
import { getTeams } from "@/lib/api/endpoints";
import { useUiStore } from "@/stores/ui";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  useUiStore.setState({ errorMessages: null });
});

describe("ErrorModal — R-FBK-02 global error surface", () => {
  it("opens from ui.errorMessages, lists every message, and dismissing closes it while the app stays mounted", () => {
    useUiStore.getState().openError(["Fallo al cargar", "HTTP 500"]);

    render(
      <>
        <div data-testid="app-root" />
        <ErrorModal />
      </>,
    );

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText("Fallo al cargar")).toBeTruthy();
    expect(screen.getByText("HTTP 500")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(useUiStore.getState().errorMessages).toBeNull();
    // Scenario: "the app remains mounted after dismiss" — nothing unmounts.
    expect(screen.getByTestId("app-root")).toBeTruthy();
  });

  it("opens with the server message when a failed GET /teams returns 500 (spec scenario)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(500, { message: "Internal server error" }),
    );

    await expect(getTeams()).rejects.toBeTruthy();
    expect(
      useUiStore.getState().errorMessages,
    ).toEqual(["Internal server error"]);

    render(<ErrorModal />);
    expect(screen.getByText("Internal server error")).toBeTruthy();
  });

  it("is NOT shown for field-mapped 400s — the surface:false mechanism login/register use (R-AUTH-03)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        message: "Validation error",
        errors: {
          formErrors: [],
          fieldErrors: { body: ["Formato inválido"] },
        },
      }),
    );

    // Same call shape as login(): surface:false → 400 fieldErrors go to the
    // form, the ui store must stay untouched → the modal can never open.
    await expect(
      apiFetch("/auth/login", {
        method: "POST",
        body: { email: "a@b.c", password: "x" },
        schema: z.object({}),
        auth: false,
        surface: false,
      }),
    ).rejects.toBeTruthy();

    expect(useUiStore.getState().errorMessages).toBeNull();
    render(<ErrorModal />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
