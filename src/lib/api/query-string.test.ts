import { describe, expect, it } from "vitest";
import { buildStickersQuery } from "./query-string";

describe("buildStickersQuery shapes GET /stickers per the pinned API contract (R-FLT-03)", () => {
  it("always sends page and limit=100 — page is required and limit is capped server-side", () => {
    expect(buildStickersQuery({}, 0)).toBe("?page=0&limit=100");
    expect(buildStickersQuery({}, 3)).toBe("?page=3&limit=100");
  });

  it("serializes check as the strings 'true'/'false' (API enum, not JSON booleans)", () => {
    expect(buildStickersQuery({ check: true }, 0)).toBe(
      "?page=0&limit=100&check=true",
    );
    expect(buildStickersQuery({ check: false }, 0)).toBe(
      "?page=0&limit=100&check=false",
    );
  });

  it("omits empty filters so untouched draft values never reach the request URL", () => {
    const filters = {
      name: "",
      teamId: "",
      positionId: undefined,
      quantity: undefined,
    };
    expect(buildStickersQuery(filters, 0)).toBe("?page=0&limit=100");
  });

  it("encodes the applied filters that DO hit the server (team, name, position)", () => {
    const filters = { teamId: 2, name: "CR7", positionId: 5 };
    expect(buildStickersQuery(filters, 1)).toBe(
      "?page=1&limit=100&teamId=2&name=CR7&positionId=5",
    );
  });

  it("serializes collectionId — the API now REQUIRES it on GET /stickers", () => {
    expect(buildStickersQuery({ collectionId: 7 }, 0)).toBe(
      "?page=0&limit=100&collectionId=7",
    );
    expect(buildStickersQuery({ teamId: 2, collectionId: 7 }, 0)).toBe(
      "?page=0&limit=100&teamId=2&collectionId=7",
    );
  });

  it("omits collectionId when undefined or null — no collection selected yet", () => {
    expect(buildStickersQuery({ collectionId: undefined }, 0)).toBe(
      "?page=0&limit=100",
    );
    expect(buildStickersQuery({ collectionId: null }, 0)).toBe(
      "?page=0&limit=100",
    );
  });
});
