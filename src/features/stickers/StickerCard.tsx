import type { KeyboardEvent, MouseEvent } from "react";
import { Trash2 } from "lucide-react";
import { usePatchSticker } from "@/hooks/usePatchSticker";
import type { Sticker } from "@/types/api";

/**
 * R-ALB-04 + R-INT-01/02: `role="button"` div (NOT `<button>` — the trash
 * control must nest, and nested buttons are invalid HTML). Click / Enter /
 * Space → optimistic `PATCH {delta:1}`; the trash button renders IFF
 * `quantity > 1` and sends `{delta:-1}` with stopPropagation so it never
 * double-increments. Green border renders from the SERVER's `check` field as
 * it arrives in cache — never recomputed here.
 */
export default function StickerCard({ sticker }: { sticker: Sticker }) {
  const patch = usePatchSticker();
  const { id, number, name, quantity, check } = sticker;

  function increment() {
    patch.mutate({ id, delta: 1 });
  }

  function decrement(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    patch.mutate({ id, delta: -1 });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      increment();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Sticker ${number} ${name}`}
      onClick={increment}
      onKeyDown={handleKeyDown}
      className={[
        "relative min-h-24 cursor-pointer rounded-md border p-md transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        check
          ? "border-success bg-success/8"
          : "border-[var(--color-hairline)] bg-surface-elevated",
      ].join(" ")}
    >
      <span className="block text-[13px] text-muted-foreground">{number}</span>
      <span className="block truncate text-sm font-medium">{name}</span>
      <span className="mt-sm inline-flex items-center rounded-full border border-[var(--color-hairline)] px-2 text-[13px]">
        ×{quantity}
      </span>

      {quantity > 1 && (
        <button
          type="button"
          aria-label="Eliminar sticker"
          onClick={decrement}
          className="absolute top-2 right-2 grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:text-danger focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
