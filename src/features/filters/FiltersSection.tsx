import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FilterBarSkeleton from "@/components/skeletons/FilterBarSkeleton";
import { useFilterDraft } from "@/hooks/useFilterDraft";
import { usePositionsQuery } from "@/hooks/usePositionsQuery";
import { useTeamsQuery } from "@/hooks/useTeamsQuery";
import { EMPTY_FILTERS, type AppliedFilters, type FilterDraft } from "@/types/filters";

interface FiltersSectionProps {
  /** App-owned committed filters — `null` = nothing applied yet (default teams view). */
  applied: AppliedFilters | null;
  /** Lifts the result of "Aplicar filtros" into App → query key (R-FLT-02). */
  onApply: (next: AppliedFilters) => void;
}

interface FilterControlsProps {
  draft: FilterDraft;
  setFields: (patch: Partial<FilterDraft>) => void;
  onApply: () => void;
}

/**
 * Filter section — R-FLT-01..04. Drafts are LOCAL (`useFilterDraft`); the
 * `/stickers` request fires ONLY on "Aplicar filtros" (the click lifts
 * `AppliedFilters` to App). Teams/positions come from the suspense caches, so
 * the first load shows `FilterBarSkeleton` inside this section's own boundary
 * (R-FBK-01) while the album below keeps `AlbumSkeleton`.
 *
 * Controls are native `<select>`/`<input type="checkbox">` per design §3
 * anatomy — no new radix wrappers in this work unit.
 */
export default function FiltersSection({
  applied,
  onApply,
}: FiltersSectionProps) {
  const { draft, setFields, apply } = useFilterDraft(applied ?? EMPTY_FILTERS);

  function handleApply() {
    onApply(apply());
  }

  return (
    <section aria-label="Filtros" className="pb-xl">
      <Suspense fallback={<FilterBarSkeleton />}>
        <FilterControls
          draft={draft}
          setFields={setFields}
          onApply={handleApply}
        />
      </Suspense>
    </section>
  );
}

function FilterControls({ draft, setFields, onApply }: FilterControlsProps) {
  const { data: teams } = useTeamsQuery();
  const { data: positions } = usePositionsQuery();

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:flex lg:items-end">
      <label className="flex flex-col gap-xs md:col-span-2 lg:flex-1">
        <span className="text-[13px] text-muted-foreground">Jugador</span>
        <Input
          value={draft.name}
          onChange={(event) => setFields({ name: event.target.value })}
          placeholder="Buscar por nombre"
        />
      </label>

      <label className="flex flex-col gap-xs">
        <span className="text-[13px] text-muted-foreground">Equipo</span>
        <select
          aria-label="Equipo"
          value={draft.teamId}
          onChange={(event) => setFields({ teamId: event.target.value })}
          className="h-14 w-full rounded-md border border-[var(--color-hairline)] bg-black/40 px-4 text-base text-white outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Todos</option>
          {teams.map((team) => (
            <option key={team.id} value={String(team.id)}>
              {team.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-xs">
        <span className="text-[13px] text-muted-foreground">Posición</span>
        <select
          aria-label="Posición"
          value={draft.positionId}
          onChange={(event) => setFields({ positionId: event.target.value })}
          className="h-14 w-full rounded-md border border-[var(--color-hairline)] bg-black/40 px-4 text-base text-white outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Todos</option>
          {positions.map((position) => (
            <option key={position.id} value={String(position.id)}>
              {position.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-xs">
        <span className="text-[13px] text-muted-foreground">Estado</span>
        <select
          aria-label="Estado"
          value={draft.check}
          onChange={(event) =>
            setFields({
              // control values are the string enum the API takes ("true"/"false")
              check: event.target.value as FilterDraft["check"],
            })
          }
          className="h-14 w-full rounded-md border border-[var(--color-hairline)] bg-black/40 px-4 text-base text-white outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Todos</option>
          <option value="true">Completados</option>
          <option value="false">Pendientes</option>
        </select>
      </label>

      <label className="flex items-center gap-sm text-sm md:self-end">
        <input
          type="checkbox"
          aria-label="Repetidos"
          checked={draft.repetidos}
          onChange={(event) => setFields({ repetidos: event.target.checked })}
          className="size-4 accent-primary"
        />
        Repetidos
      </label>

      <Button
        type="button"
        variant="light"
        onClick={onApply}
        className="h-12 w-full rounded-full lg:ml-auto lg:w-auto"
      >
        Aplicar filtros
      </Button>
    </div>
  );
}
