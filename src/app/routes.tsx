import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuthStore } from "@/stores/auth";
import { useEffect } from "react";

export const PATHS = {
  login: "/login",
  stickers: "/stickers",
} as const;

/** Authed-only area: missing token or expired session → `/login` (replace). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (token !== null) {
      const expiresAt = useAuthStore.getState().expiresAt;
      if (expiresAt !== null && Date.now() > expiresAt) {
        useAuthStore.getState().logout();
      }
    }
  }, [token]);

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
