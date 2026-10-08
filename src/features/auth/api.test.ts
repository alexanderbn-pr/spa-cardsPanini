import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { AuthResponseSchema } from "@/types/api";
import { extractToken, login, toInlineErrors } from "./api";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

function okResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  } as Response;
}

describe("AuthResponseSchema.passthrough — tolerates the UNKNOWN token field (R1/RK-1)", () => {
  it("accepts a {token} payload and keeps the known keys", () => {
    const parsed = AuthResponseSchema.safeParse({ token: "abc.def.ghi" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.token).toBe("abc.def.ghi");
  });

  it("accepts a {jwt} payload — the field name is not pinned by the API docs", () => {
    const parsed = AuthResponseSchema.safeParse({ jwt: "abc.def.ghi" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.jwt).toBe("abc.def.ghi");
  });

  it("accepts extra fields without stripping them (passthrough, not strict)", () => {
    const parsed = AuthResponseSchema.safeParse({
      token: "abc.def.ghi",
      user: { id: 1, email: "a@b.c" },
      expiresIn: 3600,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.expiresIn).toBe(3600);
  });
});

describe("extractToken — single place to fix if the contract drifts", () => {
  it("prefers the canonical `token` key", () => {
    expect(extractToken({ token: "a.b.c", jwt: "x.y.z" })).toBe("a.b.c");
  });

  it("falls back to `jwt` and `access_token` keys", () => {
    expect(extractToken({ jwt: "a.b.c" })).toBe("a.b.c");
    expect(extractToken({ access_token: "a.b.c" })).toBe("a.b.c");
  });

  it("recovers an undocumented JWT-shaped value among unknown fields", () => {
    expect(extractToken({ access: "a.b.c", expiresIn: 3600 })).toBe("a.b.c");
  });

  it("returns null when no token exists so login fails loudly, not silently", () => {
    expect(extractToken({ hello: "world" })).toBeNull();
    expect(extractToken(null)).toBeNull();
  });
});

describe("login — isolates the auth contract behind one module", () => {
  it("POSTs {email,password} to /auth/login and returns the extracted session", async () => {
    fetchMock.mockResolvedValue(
      okResponse({
        access_token: "aaa.bbb.ccc",
        user: { id: 7, email: "a@b.c" },
      }),
    );

    const session = await login({ email: "a@b.c", password: "Secret1!" });

    expect(session.token).toBe("aaa.bbb.ccc");
    expect(session.user).toMatchObject({ id: 7, email: "a@b.c" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/login");
    expect(init.body).toBe(
      JSON.stringify({ email: "a@b.c", password: "Secret1!" }),
    );
  });

  it("falls back to the submitted email when the payload carries no user", async () => {
    fetchMock.mockResolvedValue(okResponse({ token: "a.b.c" }));

    const session = await login({ email: "solo@b.c", password: "Secret1!" });

    expect(session.user).toEqual({ id: "", email: "solo@b.c" });
  });

  it("throws an ApiError when the response contains no token at all", async () => {
    fetchMock.mockResolvedValue(okResponse({ hello: "world" }));

    await expect(
      login({ email: "a@b.c", password: "Secret1!" }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe("toInlineErrors — 400 fieldErrors inline, everything else to the modal (R-AUTH-03)", () => {
  it("routes a 400 envelope message naming the password to the password field", () => {
    const error = new ApiError(400, {
      messages: ["Validation error", "password: too weak"],
      fieldErrors: ["password: too weak"],
    });

    expect(toInlineErrors(error)).toEqual({
      password: ["password: too weak"],
    });
  });

  it("routes messages naming email to the email field and the rest to the form slot", () => {
    const error = new ApiError(400, {
      messages: ["email invalido", "formato de cuenta incorrecto"],
      fieldErrors: ["email invalido"],
      formErrors: ["formato de cuenta incorrecto"],
    });

    expect(toInlineErrors(error)).toEqual({
      email: ["email invalido"],
      form: ["formato de cuenta incorrecto"],
    });
  });

  it("returns null for the duplicate-email 500 so it reaches the global modal (RK-6)", () => {
    const error = new ApiError(500, { messages: ["Internal server error"] });
    expect(toInlineErrors(error)).toBeNull();
  });

  it("returns null for a non-envelope 400 — no field names, no false inline mapping", () => {
    const error = new ApiError(400, { messages: ["Bad Request"] });
    expect(toInlineErrors(error)).toBeNull();
  });
});
