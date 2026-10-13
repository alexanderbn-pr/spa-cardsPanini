import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useCreateSticker } from "@/hooks/useCreateSticker";
import { useEditionsQuery } from "@/hooks/useEditionsQuery";
import { usePositionsQuery } from "@/hooks/usePositionsQuery";
import { useTeamsQuery } from "@/hooks/useTeamsQuery";
import type { CreateStickerRequest } from "@/types/api";

/**
 * Form contract (R-CRT-03/04): `number`/`name` are trimmed text, the two FK
 * selects carry the string id from the `<option value>`, `quantity`/`check`
 * keep their defaults. `number` stays a STRING end-to-end (zero-padded codes);
 * coercion to the wire types happens ONLY in `toRequest`.
 */
export const CreateStickerFormSchema = z.object({
  number: z.string().trim().min(1, "El número es obligatorio"),
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  idTeam: z.string().min(1, "Selecciona un equipo"),
  positionId: z.string().min(1, "Selecciona una posición"),
  editionId: z.string().min(1, "Selecciona una edición"),
  quantity: z.string().optional(),
  check: z.boolean().optional(),
});
export type CreateStickerFormValues = z.infer<typeof CreateStickerFormSchema>;

/**
 * Values → wire request (R-CRT-05). The FK selects emit strings, but the API
 * pins `idTeam` and `positionId` as numbers (OpenAPI) — this is the single
 * coercion boundary (design A5). `number` is intentionally NOT coerced.
 */
export function toRequest(
  values: CreateStickerFormValues,
): CreateStickerRequest {
  const quantity = values.quantity?.trim() ? Number(values.quantity) : 0;
  return {
    sticker: {
      number: values.number.trim(),
      name: values.name.trim(),
      positionId: Number(values.positionId),
      quantity: Number.isFinite(quantity) ? quantity : 0,
      check: values.check ?? false,
      editionId: values.editionId,
    },
    idTeam: Number(values.idTeam),
  };
}

interface CreateStickerFormProps {
  /** Called after a successful 201 (the modal closes). */
  onCreated: () => void;
  /** Called from the Cancel button (the modal closes, nothing is sent). */
  onCancel: () => void;
}

type FieldErrors = Partial<
  Record<"number" | "name" | "idTeam" | "positionId" | "editionId", string>
>;

const INITIAL_VALUES: CreateStickerFormValues = {
  number: "",
  name: "",
  idTeam: "",
  positionId: "",
  editionId: "",
  quantity: "0",
  check: false,
};

/**
 * Controlled create-sticker form (react-form: <5 fields → Zod schema + local
 * controlled draft; the reusable `FormField`/`Select` come from the very first
 * form that needs them). Validation is policy-driven: Save stays disabled until
 * the four required fields are filled, and submit re-runs `safeParse` to render
 * `flatten().fieldErrors` inline — an invalid submit fires NO request
 * (R-CRT-04). Duplicate submits are blocked while the mutation is pending.
 */
export default function CreateStickerForm({
  onCreated,
  onCancel,
}: CreateStickerFormProps) {
  const { data: teams } = useTeamsQuery();
  const { data: positions } = usePositionsQuery();
  const { data: editions } = useEditionsQuery();
  const mutation = useCreateSticker();

  const [values, setValues] = useState<CreateStickerFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // a11y (R-CRT-02): focus the first field once the form is on screen. The form
  // mounts after the teams/positions Suspense resolves, so this fires at the
  // right moment even on a cold cache.
  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  /** Patch helper (mirrors useFilterDraft): clears the changed field's error. */
  function update(patch: Partial<CreateStickerFormValues>) {
    setValues((previous) => ({ ...previous, ...patch }));
    setErrors((previous) => {
      const next = { ...previous };
      for (const key of Object.keys(patch) as Array<keyof FieldErrors>) {
        delete next[key];
      }
      return next;
    });
  }

  const isFilled =
    values.number.trim() !== "" &&
    values.name.trim() !== "" &&
    values.idTeam !== "" &&
    values.positionId !== "" &&
    values.editionId !== "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;

    const parsed = CreateStickerFormSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        number: fieldErrors.number?.[0],
        name: fieldErrors.name?.[0],
        idTeam: fieldErrors.idTeam?.[0],
        positionId: fieldErrors.positionId?.[0],
        editionId: fieldErrors.editionId?.[0],
      });
      return;
    }

    setErrors({});
    mutation.mutate(toRequest(parsed.data), { onSuccess: onCreated });
  }

  return (
    <form
      aria-label="Crear sticker"
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-md"
    >
      <FormField label="Número" htmlFor="create-number" error={errors.number}>
        <Input
          id="create-number"
          ref={firstFieldRef}
          value={values.number}
          onChange={(event) => update({ number: event.target.value })}
          placeholder="001"
        />
      </FormField>

      <FormField label="Nombre" htmlFor="create-name" error={errors.name}>
        <Input
          id="create-name"
          value={values.name}
          onChange={(event) => update({ name: event.target.value })}
          placeholder="Lamine Yamal"
        />
      </FormField>

      <FormField label="Equipo" htmlFor="create-team" error={errors.idTeam}>
        <Select
          id="create-team"
          value={values.idTeam}
          onChange={(event) => update({ idTeam: event.target.value })}
        >
          <option value="">Selecciona equipo</option>
          {teams.map((team) => (
            <option key={team.id} value={String(team.id)}>
              {team.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Posición"
        htmlFor="create-position"
        error={errors.positionId}
      >
        <Select
          id="create-position"
          value={values.positionId}
          onChange={(event) => update({ positionId: event.target.value })}
        >
          <option value="">Selecciona posición</option>
          {positions.map((position) => (
            <option key={position.id} value={String(position.id)}>
              {position.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Edición"
        htmlFor="create-edition"
        error={errors.editionId}
      >
        <Select
          id="create-edition"
          value={values.editionId}
          onChange={(event) => update({ editionId: event.target.value })}
        >
          <option value="">Selecciona edición</option>
          {editions?.map((edition) => (
            <option key={edition.id} value={String(edition.id)}>
              {edition.abbreviation}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="flex items-end gap-md">
        <FormField label="Cantidad" htmlFor="create-quantity">
          <Input
            id="create-quantity"
            type="number"
            min={0}
            value={values.quantity ?? ""}
            onChange={(event) => update({ quantity: event.target.value })}
          />
        </FormField>

        <FormField label="Conseguido" htmlFor="create-check">
          <input
            id="create-check"
            type="checkbox"
            checked={values.check ?? false}
            onChange={(event) => update({ check: event.target.checked })}
            className="size-4 accent-primary"
          />
        </FormField>
      </div>

      <div className="mt-sm flex flex-col gap-sm sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="h-12 rounded-full text-white"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="light"
          disabled={!isFilled || mutation.isPending}
          className="h-12 rounded-full"
        >
          {mutation.isPending ? "Creando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
