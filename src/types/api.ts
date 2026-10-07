import { z } from "zod";

/** The API returns ids as either numbers or strings depending on the resource. */
const IdSchema = z.union([z.string(), z.number()]);

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
});
export type Sticker = z.infer<typeof StickerSchema>;

export const TeamSchema = z.object({
  id: IdSchema,
  name: z.string(),
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
