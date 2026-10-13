import { z } from "zod";

/**
 * Client-side mirror of the server password policy (≥8 chars, ≥1 uppercase,
 * ≥1 digit, ≥1 special) — R-AUTH-01 requires the policy check to run BEFORE
 * any HTTP request is issued, so a violating password never leaves the browser.
 */
const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/[A-Z]/, "La contraseña debe contener al menos una mayúscula")
  .regex(/[0-9]/, "La contraseña debe contener al menos un dígito")
  .regex(
    /[^A-Za-z0-9]/,
    "La contraseña debe contener al menos un carácter especial",
  );

const emailSchema = z
  .string()
  .trim()
  .min(1, "El email es obligatorio")
  .email("Email inválido");

/** Login payload: exactly `{email, password}` — identifier field is `email` (R-AUTH-01). */
export const CredentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type Credentials = z.infer<typeof CredentialsSchema>;

/**
 * Register payload: adds the client-only `passwordRepeat`. Equality is enforced
 * here via `.refine` (path → passwordRepeat so `flatten().fieldErrors` maps it
 * under the input); the API body never receives it (R-AUTH-02).
 */
export const RegisterSchema = CredentialsSchema.extend({
  passwordRepeat: z.string().min(1, "Repite la contraseña"),
}).refine((values) => values.password === values.passwordRepeat, {
  message: "Las contraseñas no coinciden",
  path: ["passwordRepeat"],
});
export type RegisterValues = z.infer<typeof RegisterSchema>;
