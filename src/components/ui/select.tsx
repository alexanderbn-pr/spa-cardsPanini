import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * R-CRT-08 native `<select>` styled like `Input` (56px `h-14`, `rounded-md`,
 * hairline border on the dark canvas). A real DOM element keeps native a11y
 * (label association, keyboard) with zero radix wrappers. Reused by BOTH
 * `FiltersSection` and the create-sticker form (D4).
 *
 * The CVA base is intentionally EMPTY: the default variant carries the full
 * class string VERBATIM so the `pill` variant cannot leak non-conflicting
 * utilities (`border`, `h-14`, `w-full`) that twMerge would not remove.
 */
const selectVariants = cva("", {
  variants: {
    variant: {
      default:
        "h-14 w-full rounded-md border border-[var(--color-hairline)] bg-black/40 px-4 text-base text-white outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
      // DESIGN `collections-selector`: 36px blue/white pill on the dark sub-nav.
      // Asymmetric padding: `pl-lg pr-sm` keeps the left inset but tightens the
      // text-to-arrow gap (the OS already reserves space for the chevron).
      pill: "h-9 rounded-full bg-primary pl-lg pr-sm text-sm font-bold text-primary-foreground tracking-[0.24px] whitespace-nowrap",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Select({
  className,
  variant,
  ...props
}: React.ComponentProps<"select"> & VariantProps<typeof selectVariants>) {
  return (
    <select
      data-slot="select"
      className={cn(selectVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Select, selectVariants };
