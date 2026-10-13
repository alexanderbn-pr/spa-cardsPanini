import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSticker,
  getStickers,
  login,
  patchSticker,
  register,
} from "./endpoints";
import type { CreateStickerRequest } from "@/types/api";
import { queryKeys } from "./keys";
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

function lastCall(): [string, RequestInit] {
  return fetchMock.mock.calls.at(-1) as [string, RequestInit];
}

describe("endpoints — request shapes follow the pinned contract exactly", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    useAuthStore.setState({ token: null, user: null });
    useUiStore.setState({ errorMessages: null });
  });

  it("login sends ONLY {email,password} and tolerates the unknown response token field (R-AUTH-01)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { token: "t", anythingElse: 1 }),
    );

    const response = await login({ email: "a@b.c", password: "Secret1!" });

    const [url, init] = lastCall();
    expect(url).toContain("/auth/login");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "a@b.c",
      password: "Secret1!",
    });
    expect(response).toMatchObject({ token: "t", anythingElse: 1 });
  });

  it("register NEVER sends passwordRepeat — it is client-only validation (R-AUTH-02)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(201, { id: 1, email: "a@b.c", role: "user" }),
    );

    await register({
      email: "a@b.c",
      password: "Secret1!",
      passwordRepeat: "Secret1!",
    });

    const [url, init] = lastCall();
    expect(url).toContain("/auth/register");
    const body = JSON.parse(init.body as string);
    expect(Object.keys(body).sort()).toEqual(["email", "password"]);
    expect(body).not.toHaveProperty("passwordRepeat");
  });

  it("patchSticker sends ONLY {delta} — never check/quantity, which the server owns (R-INT-03)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        id: 7,
        number: "001",
        name: "Cristiano Ronaldo",
        positionId: 3,
        check: true,
        quantity: 3,
      }),
    );

    await patchSticker(7, 1);

    const [url, init] = lastCall();
    expect(url).toContain("/stickers/7");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ delta: 1 });
  });

  it("getStickers always carries page/limit and the applied filters (R-FLT-03)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await getStickers({ teamId: 2, check: true }, 0);

    expect(lastCall()[0]).toContain(
      "/stickers?page=0&limit=100&teamId=2&check=true",
    );
  });
});

describe("createSticker — R-CRT-05 request/response contract", () => {
  const request: CreateStickerRequest = {
    sticker: {
      number: "007",
      name: "Lionel",
      positionId: 3,
      quantity: 0,
      check: false,
    },
    idTeam: 1,
  };

  const createdSticker = {
    id: 42,
    number: "007",
    name: "Lionel",
    positionId: 3,
    position: "DEL",
    check: false,
    quantity: 0,
  };

  it("POSTs /stickers/create with the EXACT {sticker, idTeam} body and parses the 201 sticker", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, createdSticker));

    const sticker = await createSticker(request);

    const [url, init] = lastCall();
    expect(url).toContain("/stickers/create");
    expect(init.method).toBe("POST");
    // Exact body — no extra keys leaked into the request envelope.
    expect(JSON.parse(init.body as string)).toEqual(request);
    // 201 validates against StickerSchema → server-owned check/quantity survive.
    expect(sticker).toMatchObject({
      id: 42,
      number: "007",
      name: "Lionel",
      check: false,
      quantity: 0,
    });
  });

  it("surfaces a 400 through the global modal (surface defaults true) and rejects (R-CRT-07)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        message: "Validation error",
        errors: {
          formErrors: [],
          fieldErrors: { body: ["positionId inválido"] },
        },
      }),
    );

    await expect(createSticker(request)).rejects.toBeTruthy();
    // formErrors + message + fieldErrors.body, in that order (client.normalize).
    expect(useUiStore.getState().errorMessages).toEqual([
      "Validation error",
      "positionId inválido",
    ]);
  });

  it("attaches the bearer token from the auth store (auth defaults true)", async () => {
    useAuthStore.setState({ token: "jwt-123", user: null });
    fetchMock.mockResolvedValue(jsonResponse(201, createdSticker));

    await createSticker(request);

    const [, init] = lastCall();
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer jwt-123");
  });
});

describe("query key factory", () => {
  it("produces stable, structured keys for teams/positions/stickers (R-XC-04)", () => {
    expect(queryKeys.teams).toEqual(["teams"]);
    expect(queryKeys.positions).toEqual(["positions"]);
    expect(queryKeys.stickers({ teamId: 2 }, 1)).toEqual([
      "stickers",
      { teamId: 2 },
      1,
    ]);
  });
});
