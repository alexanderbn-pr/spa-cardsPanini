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
  const { id, number, name, quantity, check, editionId } = sticker;

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

  let editionBullet: React.ReactNode | null = null;
  // Read the abbreviation from the sticker data (may be nullish)
  const abbreviation = sticker.editionId;

  if (editionId === 2) {
    editionBullet = (
      <span
        key="edition-bullets"
        className="rounded-full px-2 text-[11px] bg-green-500 ml-1"
      >
        {abbreviation}
      </span>
    );
  } else if (editionId === 3) {
    editionBullet = (
      <span
        key="edition-bullets"
        className="rounded-full px-2 text-[11px] bg-blue-500 ml-1"
      >
        {" "}
        {abbreviation}
      </span>
    );
  }
  else if (editionId === 4) {
    editionBullet = (
      <span
        key="edition-bullets"
        className="rounded-full px-2 text-[11px] bg-purple-500 ml-1"
      >
        {" "}
        {abbreviation}
      </span>
    );
  }
  // editionId === "1" → skip badge entirely (no border, no bullet)

  // Build className: base + edition border (outermost) + check border (beneath)
  const baseClasses = [
    "relative min-h-24 cursor-pointer rounded-md border p-md transition-colors",
    "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
  ];
  const checkClasses =
    quantity > 1
      ? "border-warning bg-warning/8"
      : check
        ? "border-success bg-success/8"
        : "border-[var(--color-hairline)] bg-surface-elevated";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Sticker ${number} ${name}`}
      onClick={increment}
      onKeyDown={handleKeyDown}
      className={[...baseClasses, checkClasses]
        .filter((c) => c !== "")
        .join(" ")}
    >
      <div className="flex flex-row gap-sm">
        <span className="block text-[13px] text-muted-foreground">
          {number}
        </span>
        {editionBullet}
      </div>
      <span className="block truncate text-sm font-medium">{name}</span>
      <span className="mt-sm inline-flex items-center rounded-full border border-[var(--color-hairline)] px-2 text-[13px]">
        ×{quantity}
      </span>

      {quantity > 0 && (
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
