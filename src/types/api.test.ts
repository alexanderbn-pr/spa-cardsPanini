import { describe, expect, it } from "vitest";
import {
  AuthResponseSchema,
  CreateStickerBodySchema,
  CreateStickerRequestSchema,
  ErrorResponseSchema,
  PositionSchema,
  StickerSchema,
  TeamSchema,
  UserResponseSchema,
} from "./api";

const rawSticker = {
  id: 7,
  number: "001",
  name: "Cristiano Ronaldo",
  positionId: 3,
  position: "DEL",
  check: true,
  quantity: 2,
};

describe("API schemas validate the pinned contract at the boundary", () => {
  it("parses a StickerResponse keeping server-owned check/quantity (R-INT-03)", () => {
    const parsed = StickerSchema.safeParse(rawSticker);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.check).toBe(true);
      expect(parsed.data.quantity).toBe(2);
    }
  });

  it("rejects a sticker without quantity so contract drift cannot silently reach the UI", () => {
    const broken = {
      id: 7,
      number: "001",
      name: "Cristiano Ronaldo",
      positionId: 3,
      check: true,
    };
    expect(StickerSchema.safeParse(broken).success).toBe(false);
  });

  it("parses a TeamResponse with nested stickers, the source for album grouping (R-ALB-01)", () => {
    const parsed = TeamSchema.safeParse({
      id: 1,
      name: "Portugal",
      stickers: [rawSticker],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.stickers).toHaveLength(1);
  });

  it("parses a PositionResponse {id,name} used by the position filter (R-FLT-01)", () => {
    expect(PositionSchema.safeParse({ id: 5, name: "Portero" }).success).toBe(
      true,
    );
  });

  it("parses the register UserResponse {id,email,role} (R-AUTH-02)", () => {
    expect(
      UserResponseSchema.safeParse({ id: 1, email: "a@b.c", role: "user" })
        .success,
    ).toBe(true);
  });

  it("AuthResponseSchema.passthrough() tolerates the undocumented token field (R-AUTH-05, R1)", () => {
    expect(AuthResponseSchema.safeParse({ token: "abc" }).success).toBe(true);
    expect(
      AuthResponseSchema.safeParse({ jwt: "xyz", expiresIn: 3600 }).success,
    ).toBe(true);
  });

  it("rejects a sticker without quantity so contract drift cannot silently reach the UI (repeat guard)", () => {
    // Triangulation partner for the parser above: the SAME schema must reject a
    // different malformed shape, proving the result is not hardcoded.
    expect(
      StickerSchema.safeParse({ id: 7, number: "001", name: "Ronaldo" })
        .success,
    ).toBe(false);
  });

  it("parses the pinned 400 validation envelope {message, formErrors, fieldErrors.body}", () => {
    const envelope = {
      message: "Validation failed",
      errors: {
        formErrors: ["form problem"],
        fieldErrors: { body: ["email inválido"] },
      },
    };
    const parsed = ErrorResponseSchema.safeParse(envelope);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.errors.formErrors).toEqual(["form problem"]);
      expect(parsed.data.errors.fieldErrors.body).toEqual(["email inválido"]);
    }
  });
});

describe("CreateSticker schemas — R-CRT-05 request contract", () => {
  it("accepts a valid request, coerces a string positionId to a positive int, and defaults quantity=0/check=false", () => {
    const parsed = CreateStickerRequestSchema.safeParse({
      sticker: { number: "007", name: "Lionel", positionId: "3" },
      idTeam: 1,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sticker.number).toBe("007");
      expect(parsed.data.sticker.positionId).toBe(3);
      expect(parsed.data.sticker.quantity).toBe(0);
      expect(parsed.data.sticker.check).toBe(false);
      expect(parsed.data.idTeam).toBe(1);
    }
  });

  it("keeps explicit quantity/check when provided (triangulation on defaults)", () => {
    const parsed = CreateStickerBodySchema.safeParse({
      number: "001",
      name: "Andrés",
      positionId: 2,
      quantity: 5,
      check: true,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.quantity).toBe(5);
      expect(parsed.data.check).toBe(true);
    }
  });

  it("rejects positionId 0 or negative — a position FK must be a positive integer", () => {
    expect(
      CreateStickerBodySchema.safeParse({
        number: "001",
        name: "x",
        positionId: 0,
      }).success,
    ).toBe(false);
    expect(
      CreateStickerBodySchema.safeParse({
        number: "001",
        name: "x",
        positionId: -2,
      }).success,
    ).toBe(false);
  });

  it("rejects a missing or empty number — a sticker must carry its number (R-CRT-03)", () => {
    expect(
      CreateStickerBodySchema.safeParse({ name: "x", positionId: 1 }).success,
    ).toBe(false);
    expect(
      CreateStickerBodySchema.safeParse({
        number: "",
        name: "x",
        positionId: 1,
      }).success,
    ).toBe(false);
  });
});
