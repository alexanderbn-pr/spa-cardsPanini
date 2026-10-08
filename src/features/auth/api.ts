import { z } from "zod";
import { ApiError } from "@/lib/api/client";
import {
  login as postLogin,
  register as postRegister,
  type CredentialsInput,
  type RegisterInput,
} from "@/lib/api/endpoints";
import type { AuthUser } from "@/stores/auth";
import type { UserResponse } from "@/types/api";

/**
 * AUTH CONTRACT ISOLATION POINT (risk R1 / RK-1).
 *
 * The login response token FIELD name is undocumented (`token`? `jwt`? other?),
 * so `AuthResponseSchema.passthrough()` accepts any shape and ALL extraction
 * happens here: if the real contract drifts, this is the only file to touch.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Picks the JWT out of an unknown login payload: known keys first, then any JWT-shaped string. */
export function extractToken(response: unknown): string | null {
  if (!isRecord(response)) return null;
  for (const key of ["token", "jwt", "access_token"]) {
    const value = response[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  for (const value of Object.values(response)) {
    if (typeof value === "string" && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(value)) {
      return value;
    }
  }
  return null;
}

const embeddedUserSchema = z.object({
  id: z.union([z.string(), z.number()]),
  email: z.string(),
  role: z.string().optional(),
});

/** Best-effort user: embedded `{id,email}` if the payload carries it, else the submitted email. */
function extractUser(response: unknown, fallbackEmail: string): AuthUser {
  if (isRecord(response)) {
    const candidate = isRecord(response.user) ? response.user : response;
    const parsed = embeddedUserSchema.safeParse(candidate);
    if (parsed.success) {
      return {
        id: parsed.data.id,
        email: parsed.data.email,
        role: parsed.data.role,
      };
    }
  }
  return { id: "", email: fallbackEmail };
}

export interface LoginSession {
  token: string;
  user: AuthUser;
}

/** POST /auth/login → `{email,password}` body, token isolated above. `surface:false` keeps 400 field errors inline (R-AUTH-03). */
export async function login(
  credentials: CredentialsInput,
): Promise<LoginSession> {
  const response: unknown = await postLogin(credentials);
  const token = extractToken(response);
  if (token === null) {
    throw new ApiError(500, { messages: ["Respuesta inválida del servidor"] });
  }
  return { token, user: extractUser(response, credentials.email) };
}

/** POST /auth/register — `passwordRepeat` never leaves the client (R-AUTH-02). */
export function register(input: RegisterInput): Promise<UserResponse> {
  return postRegister(input);
}

export type InlineFieldErrors = Partial<
  Record<"email" | "password" | "passwordRepeat", string[]>
> & { form?: string[] };

/**
 * Maps a 400 validation envelope onto form fields (R-AUTH-03): messages naming
 * `email`/`password` land under their input, the rest under a form-level slot.
 * Returns `null` for anything that must go to the global error modal instead
 * (500 duplicate-email backend bug, network failure, non-envelope 400s).
 */
export function toInlineErrors(error: unknown): InlineFieldErrors | null {
  if (!(error instanceof ApiError) || error.status !== 400) return null;
  const messages = [...error.formErrors, ...error.fieldErrors];
  if (messages.length === 0) return null;

  const email: string[] = [];
  const password: string[] = [];
  const form: string[] = [];
  for (const message of messages) {
    const lower = message.toLowerCase();
    if (lower.includes("email")) email.push(message);
    else if (lower.includes("contraseña") || lower.includes("password")) {
      password.push(message);
    } else form.push(message);
  }

  const inline: InlineFieldErrors = {};
  if (email.length > 0) inline.email = email;
  if (password.length > 0) inline.password = password;
  if (form.length > 0) inline.form = form;
  return inline;
}
