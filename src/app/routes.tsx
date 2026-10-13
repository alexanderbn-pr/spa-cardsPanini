import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuthStore } from "@/stores/auth";

/**
 * Route guards — R-RT-01 / ADR-2 / ADR-3.
 *
 * This module holds ONLY path constants and guards; layouts stay composed in
 * `App.tsx` (composition root — design §5/§6). Imports are limited to
 * `react-router` + `@/stores/auth`: zero feature imports, so no layer-rule
 * tension and no feature→feature edges.
 *
 * Guards are declarative `<Navigate replace/>` JSX, never `useEffect`
 * redirects (ADR-3): no one-frame flash of the rejected screen, and `replace`
 * overwrites the rejected history entry so Back cannot return to a guarded
 * URL (no back-button trap). Each guard subscribes via a zustand field
 * selector (`token`) so any token clear re-evaluates the guard reactively.
 */

export const PATHS = {
  login: "/login",
  stickers: "/stickers",
} as const;

/** Authed-only area: missing token → `/login` (replace). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);
  return token === null ? <Navigate to={PATHS.login} replace /> : children;
}

/** Guest-only area: stored token → `/stickers` (replace). */
export function RequireGuest({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);
  return token === null ? children : <Navigate to={PATHS.stickers} replace />;
}

/** `/` and every unmatched path resolve by the SAME `token === null` rule. */
export function RootRedirect() {
  const token = useAuthStore((state) => state.token);
  return (
    <Navigate to={token === null ? PATHS.login : PATHS.stickers} replace />
  );
}
