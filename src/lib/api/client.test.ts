import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, apiFetch, normalize } from "./client";
import { useAuthStore } from "@/stores/auth";
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

const okSchema = z.object({ ok: z.boolean() });

describe("apiFetch — the single boundary for every request", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    useAuthStore.setState({ token: null, user: null });
    useUiStore.setState({ errorMessages: null });
  });

  it("injects the Bearer token from auth getState() — works outside React (R-AUTH-05)", async () => {
    useAuthStore.setState({ token: "jwt-abc" });
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await apiFetch("/teams", { schema: okSchema });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer jwt-abc",
    );
  });

  it("401 auto-logs-out and throws WITHOUT a modal — the gate sends the user to login (R-AUTH-06)", async () => {
    useAuthStore.setState({ token: "expired" });
    fetchMock.mockResolvedValue(jsonResponse(401, { message: "Unauthorized" }));

    await expect(
      apiFetch("/teams", { schema: okSchema }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().token).toBeNull();
    expect(useUiStore.getState().errorMessages).toBeNull();
  });

  it("400 envelope → ApiError with flattened messages AND the global modal (R-FBK-02)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        message: "Validation failed",
        errors: {
          formErrors: ["Datos inválidos"],
          fieldErrors: { body: ["email inválido"] },
        },
      }),
    );

    await expect(
      apiFetch("/teams", { schema: okSchema }),
    ).rejects.toMatchObject({
      status: 400,
      messages: ["Datos inválidos", "Validation failed", "email inválido"],
      fieldErrors: ["email inválido"],
    });
    expect(useUiStore.getState().errorMessages).toEqual([
      "Datos inválidos",
      "Validation failed",
      "email inválido",
    ]);
  });

  it("network failure surfaces the Spanish connection message instead of failing silently (R8)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiFetch("/teams", { schema: okSchema })).rejects.toThrow(
      "No se pudo conectar con el servidor",
    );
    expect(useUiStore.getState().errorMessages).toEqual([
      "No se pudo conectar con el servidor",
    ]);
  });

  it("passes the caller AbortSignal through to fetch so react-query can cancel (R-XC-04)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    const controller = new AbortController();

    await apiFetch("/teams", { schema: okSchema, signal: controller.signal });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });

  it("200 with an unparseable body → invalid-response ApiError + modal (Zod at the boundary)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { unexpected: true }));

    await expect(
      apiFetch("/teams", { schema: okSchema }),
    ).rejects.toMatchObject({
      messages: ["Respuesta inválida del servidor"],
    });
    expect(useUiStore.getState().errorMessages).toEqual([
      "Respuesta inválida del servidor",
    ]);
  });

  it("surface:false throws without a modal so auth 400 fieldErrors can render inline (R-AUTH-03)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        message: "Validation failed",
        errors: { formErrors: [], fieldErrors: { body: ["email inválido"] } },
      }),
    );

    await expect(
      apiFetch("/auth/login", {
        method: "POST",
        schema: okSchema,
        surface: false,
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(useUiStore.getState().errorMessages).toBeNull();
  });
});

describe("normalize() — any failure body maps to a displayable ApiError", () => {
  it("maps the pinned envelope preserving order and structure", () => {
    const error = normalize(400, "Bad Request", {
      message: "Validation failed",
      errors: { formErrors: ["f"], fieldErrors: { body: ["fb"] } },
    });
    expect(error.messages).toEqual(["f", "Validation failed", "fb"]);
    expect(error.formErrors).toEqual(["f"]);
    expect(error.fieldErrors).toEqual(["fb"]);
  });

  it("falls back to body.message for non-conforming bodies (documented register-500 bug, R6)", () => {
    expect(
      normalize(500, "Internal Server Error", { message: "duplicate key" })
        .messages,
    ).toEqual(["duplicate key"]);
  });

  it("falls back to the HTTP status text when the body is not JSON at all", () => {
    expect(normalize(502, "Bad Gateway", null).messages).toEqual([
      "Bad Gateway",
    ]);
  });
});
