import { Button } from "@/components/ui/button";
import { useErrorMessages, useUiStore } from "@/stores/ui";

/**
 * Global error surface — R-FBK-02: opens from `ui.errorMessages`, which
 * `lib/api/client.ts` fills ONLY for non-field-mapped failures (5xx, network,
 * invalid-response, the documented register-500 bug). Field-mapped 400s from
 * login/register go inline (R-AUTH-03, `surface:false`) and never reach the
 * store — so they can never open this modal.
 *
 * Dismissing (`Cerrar` or backdrop) just closes the store entry: the app
 * underneath stays mounted (scenario: "the app remains mounted after dismiss").
 * Field selectors throughout (zustand-5): `useErrorMessages()` is shallow and
 * `closeError` is a stable action — no whole-store subscription.
 */
export default function ErrorModal() {
  const messages = useErrorMessages();
  const closeError = useUiStore((state) => state.closeError);

  if (messages === null) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Error"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-lg"
      onClick={closeError}
    >
      <div
        className="w-full max-w-md rounded-lg border border-[var(--color-hairline)] bg-surface-elevated p-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-md text-lg font-medium text-danger">Error</h2>
        <ul className="mb-lg flex flex-col gap-sm">
          {messages.map((message) => (
            <li key={message} className="text-sm text-muted-foreground">
              {message}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="light"
          className="h-12 w-full rounded-full"
          onClick={closeError}
        >
          Cerrar
        </Button>
      </div>
    </div>
  );
}
