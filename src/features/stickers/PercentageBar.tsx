interface PercentageBarProps {
  checked: number;
  total: number;
}

/**
 * R-ALB-01: `{checked}/{total}` progress over ALL nested stickers of `['teams]`
 * (the bare `/stickers` array has no totals — this is the only valid source).
 * Mobile-first (425 → 1440): stacked label/fraction on xs, inline above the
 * track from md up (design §3 anatomy).
 */
export default function PercentageBar({ checked, total }: PercentageBarProps) {
  const percent = total === 0 ? 0 : (checked / total) * 100;

  return (
    <section
      aria-label="Progreso de la colección"
      className="rounded-lg bg-surface-elevated p-lg md:p-xl"
    >
      <div className="flex flex-col gap-sm md:flex-row md:items-baseline md:justify-between">
        <span className="text-sm text-muted-foreground">Tu colección</span>
        <span className="text-3xl leading-none font-medium tracking-[-1%] md:text-4xl">
          {checked}/{total}
        </span>
      </div>

      <div className="mt-md h-2 rounded-full bg-[var(--color-hairline)]">
        <div
          data-testid="percentage-fill"
          className="h-full rounded-full bg-success"
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
}
