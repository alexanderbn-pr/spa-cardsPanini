import { cn } from "@/lib/utils";

/**
 * R-CRT-08 native `<select>` styled like `Input` (56px `h-14`, `rounded-md`,
 * hairline border on the dark canvas). A real DOM element keeps native a11y
 * (label association, keyboard) with zero radix wrappers. Reused by BOTH
 * `FiltersSection` and the create-sticker form (D4).
 */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "h-14 w-full rounded-md border border-[var(--color-hairline)] bg-black/40 px-4 text-base text-white outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
