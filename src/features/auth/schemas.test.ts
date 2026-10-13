import { describe, expect, it } from "vitest";
import { CredentialsSchema, RegisterSchema } from "./schemas";

describe("CredentialsSchema — mirrors the server password policy client-side (R-AUTH-01)", () => {
  it("flags a password shorter than 8 chars so the request is blocked before send", () => {
    const result = CredentialsSchema.safeParse({
      email: "a@b.co",
      password: "Ab1!",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.password).toEqual([
      "La contraseña debe tener al menos 8 caracteres",
    ]);
  });

  it("flags a missing uppercase letter (policy: ≥1 uppercase)", () => {
    const result = CredentialsSchema.safeParse({
      email: "a@b.co",
      password: "abcdefgh1!",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.password?.[0]).toMatch(
      /mayúscula/,
    );
  });

  it("flags a missing digit (policy: ≥1 digit)", () => {
    const result = CredentialsSchema.safeParse({
      email: "a@b.co",
      password: "Abcdefgh!",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.password?.[0]).toMatch(/dígito/);
  });

  it("flags a missing special char (policy: ≥1 special)", () => {
    const result = CredentialsSchema.safeParse({
      email: "a@b.co",
      password: "Abcdefgh1",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.password?.[0]).toMatch(
      /especial/,
    );
  });

  it("rejects a malformed email under its own field key for inline rendering", () => {
    const result = CredentialsSchema.safeParse({
      email: "not-an-email",
      password: "Secret1!",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const { fieldErrors } = result.error.flatten();
    expect(fieldErrors.email).toEqual(["Email inválido"]);
    expect(fieldErrors.password).toBeUndefined();
  });

  it("accepts valid credentials so the submit path can issue the request", () => {
    const result = CredentialsSchema.safeParse({
      email: "  user@example.com ",
      password: "Secret1!",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.email).toBe("user@example.com");
  });
});

describe("RegisterSchema — client-only passwordRepeat equality (R-AUTH-02)", () => {
  it("blocks a mismatched repeat via .refine so NO request is ever sent", () => {
    const result = RegisterSchema.safeParse({
      email: "a@b.co",
      password: "Secret1!",
      passwordRepeat: "Secret2!",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.passwordRepeat).toEqual([
      "Las contraseñas no coinciden",
    ]);
  });

  it("flattens into per-field string arrays the form can render directly", () => {
    const result = RegisterSchema.safeParse({
      email: "bad",
      password: "weak",
      passwordRepeat: "",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const { fieldErrors, formErrors } = result.error.flatten();
    expect(formErrors).toEqual([]);
    expect(Array.isArray(fieldErrors.email)).toBe(true);
    expect(Array.isArray(fieldErrors.password)).toBe(true);
    expect(Array.isArray(fieldErrors.passwordRepeat)).toBe(true);
  });

  it("accepts matching, policy-compliant values — the only shape that reaches POST /auth/register", () => {
    const result = RegisterSchema.safeParse({
      email: "user@example.com",
      password: "Secret1!",
      passwordRepeat: "Secret1!",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual({
      email: "user@example.com",
      password: "Secret1!",
      passwordRepeat: "Secret1!",
    });
  });
});
