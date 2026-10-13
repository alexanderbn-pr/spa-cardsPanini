import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "./auth";

const STORAGE_KEY = "ligae-auth";

interface PersistedShape {
  state: { token: string | null; user: { id: number; email: string } | null };
  version: number;
}

function readStorage(): PersistedShape {
  const raw = localStorage.getItem(STORAGE_KEY);
  return JSON.parse(raw ?? "{}") as PersistedShape;
}

describe("auth store — session persistence (R-AUTH-04)", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null });
  });

  it("setSession stores token+user in memory AND persists them to ligae-auth", () => {
    useAuthStore.getState().setSession("jwt-123", { id: 1, email: "a@b.c" });

    expect(useAuthStore.getState().token).toBe("jwt-123");
    expect(readStorage().state.token).toBe("jwt-123");
    expect(readStorage().state.user?.email).toBe("a@b.c");
  });

  it("logout clears the session from memory and from storage so no stale JWT survives", () => {
    useAuthStore.getState().setSession("jwt-123", { id: 1, email: "a@b.c" });
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(readStorage().state.token).toBeNull();
  });

  it("restores a persisted session when the store is created (page refresh keeps the user logged in)", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: { token: "persisted-jwt", user: { id: 9, email: "r@x.y" } },
        version: 0,
      }),
    );

    vi.resetModules();
    const { useAuthStore: freshStore } = await import("./auth");

    expect(freshStore.getState().token).toBe("persisted-jwt");
    expect(freshStore.getState().user?.email).toBe("r@x.y");
  });
});
