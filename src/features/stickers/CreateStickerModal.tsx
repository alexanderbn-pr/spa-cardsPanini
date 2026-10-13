import { Suspense, useEffect, useState } from "react";
import CreateStickerForm from "./CreateStickerForm";

interface CreateStickerModalProps {
  /** Dismissal path shared by Escape, the backdrop and a successful create. */
  onClose: () => void;
}

/**
 * Hand-rolled create dialog (D2) — the SAME anatomy as `ErrorModal`, no radix:
 * `role="dialog"` + `aria-modal`, backdrop click closes while an inner click is
 * stopped by the panel, Escape closes, body scroll locks while open and the
 * trigger's focus is restored on unmount. z-40 sits BELOW `ErrorModal` (z-50)
 * so a 400/network error surfaces on top of the still-open form (R-CRT-07).
 *
 * The teams/positions selects suspend, so the form is wrapped in its own
 * `Suspense`; the modal chrome is already painted when it resolves.
 */
export default function CreateStickerModal({
  onClose,
}: CreateStickerModalProps) {
  /**
   * The element focused BEFORE the dialog mounted (the trigger). Captured
   * during the first render — before any child effect can steal focus — so the
   * focus-restore cleanup can hand it back when the dialog unmounts.
   */
  const [restoreFocusTo] = useState<HTMLElement | null>(() =>
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    return () => {
      restoreFocusTo?.focus();
    };
  }, [restoreFocusTo]);

  return (
    <div
      data-testid="create-sticker-backdrop"
      className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-md sm:p-lg"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-sticker-title"
        className="max-h-[85dvh] w-full overflow-y-auto rounded-lg border border-[var(--color-hairline)] bg-surface-elevated p-lg sm:p-xxl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="create-sticker-title"
          className="mb-md text-lg font-medium text-white"
        >
          Crear sticker
        </h2>
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground" role="status">
              Cargando…
            </p>
          }
        >
          <CreateStickerForm onCreated={onClose} onCancel={onClose} />
        </Suspense>
      </div>
    </div>
  );
}
