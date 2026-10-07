import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStickers, login, patchSticker, register } from "./endpoints";
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
