import { z } from "zod";

/** The API returns ids as either numbers or strings depending on the resource. */
const IdSchema = z.union([z.string(), z.number()]);

export const EditionSchema = z.object({
  id: z.union([z.string(), z.number()]),
  abbreviation: z.string(),
});
export type Edition = z.infer<typeof EditionSchema>;

/**
 * Collection as returned by `GET /collection` (OpenAPI: CollectionResponse).
 * NOTE: a collection is NOT an edition — it carries `name` + a `completed`
 * flag. Teams belong to a collection via `TeamSchema.collectionId`, which is
 * what `GET /teams?collectionId=X` filters on (NOT the sticker `editionId`).
 */
export const CollectionSchema = z.object({
  id: IdSchema,
  name: z.string(),
  completed: z.boolean().optional(),
});
export type Collection = z.infer<typeof CollectionSchema>;

export const StickerSchema = z.object({
  id: IdSchema,
  /** Zero-padded code ("001") — kept as string, rendered as-is. */
  number: z.string(),
  name: z.string(),
  positionId: IdSchema.nullish(),
  position: z.string().nullish(),
  /** Server-owned: `check = quantity >= 1` — never sent by the client. */
  check: z.boolean(),
  /** Server-owned: only mutated via `PATCH {delta}`. */
  quantity: z.number(),
  editionId: IdSchema.nullish(),
  abbreviation: z.string().nullish(),
});
export type Sticker = z.infer<typeof StickerSchema>;

export const TeamSchema = z.object({
  id: IdSchema,
  name: z.string(),
  /** Team → collection affiliation — the server-side `?collectionId=` filter key. */
  collectionId: z.number().nullable().optional(),
  /** Teams come with nested stickers → percentage + grouping from one call. */
  stickers: z.array(StickerSchema),
});
export type Team = z.infer<typeof TeamSchema>;

export const PositionSchema = z.object({
  id: IdSchema,
  name: z.string(),
});
export type Position = z.infer<typeof PositionSchema>;

export const UserResponseSchema = z.object({
  id: IdSchema,
  email: z.string(),
  role: z.string().optional(),
});
export type UserResponse = z.infer<typeof UserResponseSchema>;

/**
 * Login response: the token FIELD name is not documented (risk R1), so the schema
 * is passthrough — extraction stays isolated in features/auth/api.ts (one-file fix
 * if the contract drifts).
 */
export const AuthResponseSchema = z
  .object({
    token: z.string().optional(),
    jwt: z.string().optional(),
  })
  .passthrough();
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/**
 * POST /stickers/create body payload (R-CRT-05). `number` stays a STRING
 * (zero-padded codes like "007" must survive end-to-end — never numeric coercion).
 * `positionId` accepts the selector's string OR a typed number and normalizes to
 * a POSITIVE integer; `quantity`/`check` default to the server's initial state
 * (0 / false) so an untouched form still produces a complete request.
 */
export const CreateStickerBodySchema = z.object({
  number: z.string().min(1),
  name: z.string().min(1),
  positionId: z
    .union([z.string(), z.number()])
    .transform(Number)
    .pipe(z.number().int().positive()),
  quantity: z.number().int().min(0).default(0),
  check: z.boolean().default(false),
  editionId: IdSchema.nullish().optional(),
});
export type CreateStickerBody = z.infer<typeof CreateStickerBodySchema>;

/**
 * POST /stickers/create request envelope: the sticker body + its team FK
 * (`idTeam`, an existing string|number id). Edition is intentionally OUT of
 * scope (D5) — FKs are equipo + posición ONLY.
 */
export const CreateStickerRequestSchema = z.object({
  sticker: CreateStickerBodySchema,
  idTeam: IdSchema,
});
export type CreateStickerRequest = z.infer<typeof CreateStickerRequestSchema>;

/** Pinned 400 validation envelope. */
export const ErrorResponseSchema = z.object({
  message: z.string(),
  errors: z.object({
    formErrors: z.array(z.string()),
    fieldErrors: z.object({
      body: z.array(z.string()),
    }),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
