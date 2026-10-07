import { z, type ZodType } from "zod";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";

/** `VITE_API_URL` lets the app point at a proxy without code changes (design R8). */
const BASE: string =
  import.meta.env.VITE_API_URL ?? "https://wsc-cards-panini.vercel.app";

const NETWORK_MESSAGE = "No se pudo conectar con el servidor";
const INVALID_RESPONSE_MESSAGE = "Respuesta inválida del servidor";

export interface ApiFetchOptions<T> {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  signal?: AbortSignal;
  schema: ZodType<T>;
  /** Attach `Authorization: Bearer` (default true). */
  auth?: boolean;
  /**
   * Open the global error modal on failure (default true). Auth endpoints pass
   * `false` so a 400 with fieldErrors can render inline instead (R-AUTH-03).
   */
  surface?: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];
  readonly formErrors: string[];
  readonly fieldErrors: string[];

  constructor(
    status: number,
    init: { messages: string[]; formErrors?: string[]; fieldErrors?: string[] },
  ) {
    super(init.messages.join(" · ") || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.messages = init.messages;
    this.formErrors = init.formErrors ?? [];
    this.fieldErrors = init.fieldErrors ?? [];
  }
}

const envelopeSchema = z.object({
  message: z.string(),
  errors: z.object({
    formErrors: z.array(z.string()),
    fieldErrors: z.object({ body: z.array(z.string()) }),
  }),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Maps any failure body onto ApiError: pinned envelope first (formErrors + message +
 * fieldErrors.body), then a bare `message` (e.g. the documented register-500 bug, R6),
 * then the HTTP status text for non-JSON bodies — never throws, never silent.
 */
export function normalize(
  status: number,
  statusText: string,
  body: unknown,
): ApiError {
  const envelope = envelopeSchema.safeParse(body);
  if (envelope.success) {
    const { message, errors } = envelope.data;
    return new ApiError(status, {
      messages: [...errors.formErrors, message, ...errors.fieldErrors.body],
      formErrors: errors.formErrors,
      fieldErrors: errors.fieldErrors.body,
    });
  }
  if (
    isRecord(body) &&
    typeof body.message === "string" &&
    body.message.length > 0
  ) {
    return new ApiError(status, { messages: [body.message] });
  }
  return new ApiError(status, { messages: [statusText || `HTTP ${status}`] });
}

/**
 * Single fetch wrapper: Bearer via `getState()` (outside React), Zod at the
 * boundary, 401 → auto-logout, normalized errors, AbortSignal pass-through.
 */
export async function apiFetch<T>(
  path: string,
  opts: ApiFetchOptions<T>,
): Promise<T> {
  const surface = opts.surface !== false;
  const token = useAuthStore.getState().token;

  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? "GET",
      signal: opts.signal,
      headers: {
        "Content-Type": "application/json",
        ...(opts.auth !== false && token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error; // caller cancelled — not an error
    if (surface) useUiStore.getState().openError([NETWORK_MESSAGE]);
    throw new ApiError(0, { messages: [NETWORK_MESSAGE] });
  }

  const body: unknown = await res.json().catch(() => null);

  if (res.status === 401 && opts.auth !== false) {
    useAuthStore.getState().logout(); // stale/invalid JWT → back to login, no modal
    throw normalize(res.status, res.statusText, body);
  }
  if (!res.ok) {
    const apiError = normalize(res.status, res.statusText, body);
    if (surface) useUiStore.getState().openError(apiError.messages);
    throw apiError;
  }

  const parsed = opts.schema.safeParse(body);
  if (!parsed.success) {
    if (surface) useUiStore.getState().openError([INVALID_RESPONSE_MESSAGE]);
    throw new ApiError(res.status, { messages: [INVALID_RESPONSE_MESSAGE] });
  }
  return parsed.data;
}
