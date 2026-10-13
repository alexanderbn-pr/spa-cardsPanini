import { describe, expect, it } from "vitest";
import { compareStickerNumber } from "./number-order";

/**
 * R-ALB-04 S2 / ADR-4: ONE shared comparator, pinned BEFORE render edits.
 * The sequence is EXACT — locale drift in CI fails this loudly (design R3).
 */
describe("number-order — R-ALB-04 alphanumeric natural order (ADR-4)", () => {
  it("sorts the exact sequence 1, 2, 3a, 3b, 4, 10 — '10' never precedes '3a' or '4'", () => {
    const scrambled = ["10", "3a", "1", "4", "3b", "2"];

    expect([...scrambled].sort(compareStickerNumber)).toEqual([
      "1",
      "2",
      "3a",
      "3b",
      "4",
      "10",
    ]);
  });

  it("keeps zero-padded numbers in numeric order 001, 002, 003", () => {
    const scrambled = ["003", "001", "002"];

    expect([...scrambled].sort(compareStickerNumber)).toEqual([
      "001",
      "002",
      "003",
    ]);
  });
});
