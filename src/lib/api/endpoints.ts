import { z } from "zod";
import { apiFetch } from "./client";
import { buildStickersQuery, type StickersFilters } from "./query-string";
import {
  AuthResponseSchema,
  CollectionSchema,
  EditionSchema,
  PositionSchema,
  StickerSchema,
  TeamSchema,
  UserResponseSchema,
} from "@/types/api";
import type {
  AuthResponse,
  Collection,
  CreateStickerRequest,
  Edition,
  Position,
  Sticker,
  Team,
  UserResponse,
} from "@/types/api";

export interface CredentialsInput {
  email: string;
  password: string;
}

export interface RegisterInput extends CredentialsInput {
  /** Client-only (.refine match) — NEVER sent to the API. */
  passwordRepeat: string;
}

/** surface:false → 400 fieldErrors are thrown for inline rendering, not the modal (R-AUTH-03). */
export function login(
  credentials: CredentialsInput,
  signal?: AbortSignal,
): Promise<AuthResponse> {
  return apiFetch("/auth/login", {
    method: "POST",
    body: { email: credentials.email, password: credentials.password },
    schema: AuthResponseSchema,
    auth: false,
    surface: false,
    signal,
  });
}

export function register(
  input: RegisterInput,
  signal?: AbortSignal,
): Promise<UserResponse> {
  return apiFetch("/auth/register", {
    method: "POST",
    // passwordRepeat is validated client-side only — never part of the body
    body: { email: input.email, password: input.password },
    schema: UserResponseSchema,
    auth: false,
    surface: false,
    signal,
  });
}

/**
 * Teams come with nested stickers → album grouping + percentage from ONE call.
 * When `collectionId` is set the request is scoped to that collection
 * (`/teams?collectionId=<id>`); otherwise the full roster is returned.
 */
export function getTeams(
  collectionId?: number | null,
  signal?: AbortSignal,
): Promise<Team[]> {
  const query = collectionId != null ? `?collectionId=${collectionId}` : "";
  return apiFetch(`/teams${query}`, { schema: z.array(TeamSchema), signal });
}

export function getStickers(
  filters: StickersFilters,
  page: number,
  signal?: AbortSignal,
): Promise<Sticker[]> {
  return apiFetch(`/stickers${buildStickersQuery(filters, page)}`, {
    schema: z.array(StickerSchema),
    signal,
  });
}

/** Only `{delta}` — the server owns check/quantity (additionalProperties: false). */
export function patchSticker(
  id: string | number,
  delta: number,
  signal?: AbortSignal,
): Promise<Sticker> {
  return apiFetch(`/stickers/${id}`, {
    method: "PATCH",
    body: { delta },
    schema: StickerSchema,
    signal,
  });
}

export function getEditions(signal?: AbortSignal): Promise<Edition[]> {
  return apiFetch("/editions", { schema: z.array(EditionSchema), signal });
}

export function getPositions(signal?: AbortSignal): Promise<Position[]> {
  return apiFetch("/positions", { schema: z.array(PositionSchema), signal });
}

/**
 * `GET /collection` → collections (OpenAPI: CollectionResponse). A collection
 * is `{ id, name, completed? }` — NOT an edition. Selecting one scopes
 * `/teams?collectionId=<id>` (see `getTeams`).
 */
export function getCollections(signal?: AbortSignal): Promise<Collection[]> {
  return apiFetch("/collection", { schema: z.array(CollectionSchema), signal });
}

/**
 * R-CRT-05/07: create a sticker. The body is the type-safe `CreateStickerRequest`
 * (built by `toRequest`) sent verbatim — no double parse. `surface` defaults
 * TRUE so a 400/network failure opens the global ErrorModal (R-FBK-02) while the
 * create modal stays open. 201 validates against `StickerSchema`.
 */
export function createSticker(
  input: CreateStickerRequest,
  signal?: AbortSignal,
): Promise<Sticker> {
  return apiFetch("/stickers/create", {
    method: "POST",
    body: input,
    schema: StickerSchema,
    signal,
  });
}
