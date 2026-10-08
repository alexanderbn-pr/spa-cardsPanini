import { Component, type ErrorInfo, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/api/keys";

interface RouteErrorBoundaryProps {
  /**
   * Navigation key (pathname) — a route change with a stale fallback resets it
   * (ADR-2 belt-and-braces; the primary 401-logout reset is the boundary
   * UNMOUNTING via `RequireAuth`'s `<Navigate>` — placement inside the guard).
   */
  resetKey: string;
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
}

/**
 * Suspense-error boundary — R-FBK-03 (ADR-2): a suspense query error in ANY
 * child (both `/teams` consumers) renders ONE fallback instead of unmounting
 * the tree (the black screen). Suspense is NOT an error boundary (React 19),
 * so recovery is explicit: reset on `resetKey` change or via the manual
 * "Reintentar" button of the fallback (ADR-3).
 */
export default class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): Partial<RouteErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[RouteErrorBoundary]", error, info.componentStack);
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  resetBoundary = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return <ErrorFallback onReset={this.resetBoundary} />;
  }
}

/**
 * Fallback shown while the boundary is in error state. Hooks are allowed here
 * (element rendered BY the class) — the query client comes from the provider.
 *
 * ADR-3 order (never reversed): invalidate teams, THEN positions, THEN reset —
 * reset-before-invalidate would re-throw while the queries are still in error
 * state (re-throw loop, risk R3). Reset must come AFTER the invalidations flip
 * the queries to `pending` so the children suspend into their skeletons again.
 *
 * `refetchType: 'all'` is REQUIRED: while the fallback is shown the children
 * are UNMOUNTED, so the errored queries are INACTIVE — the default
 * `'active'` refetch only marks them stale. On reset, `useSuspenseQuery`
 * reads the query synchronously during render (before subscribe/fetch) and
 * would re-throw the old error forever. A started fetch flips `status` to
 * `pending` synchronously, so the remounted child suspends instead. The
 * suspense `fetchOptimistic` then joins the in-flight fetch (no 2nd request).
 */
function ErrorFallback({ onReset }: { onReset: () => void }) {
  const queryClient = useQueryClient();

  function handleRetry() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.teams,
      refetchType: "all",
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.positions,
      refetchType: "all",
    });
    onReset();
  }

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-lg rounded-lg border border-[var(--color-hairline)] bg-surface-elevated p-xl text-center"
    >
      <p className="text-sm text-muted-foreground">
        Ocurrió un error al cargar la información
      </p>
      <Button
        type="button"
        variant="light"
        data-testid="error-fallback"
        className="h-12 rounded-full px-lg"
        onClick={handleRetry}
      >
        Reintentar
      </Button>
    </div>
  );
}
