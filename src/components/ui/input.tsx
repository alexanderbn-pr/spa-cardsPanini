import { cn } from "@/lib/utils";

/**
 * DESIGN text input: 56px (h-14) pill-cornered field on the dark canvas,
 * hairline border instead of shadow. Reused by login + register forms.
 */
function Input({
  className,
  type = "text",
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-14 w-full rounded-md border border-[var(--color-hairline)] bg-black/40 px-4 text-base text-white outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
