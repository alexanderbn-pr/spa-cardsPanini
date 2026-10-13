import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api/client";
import { queryKeys } from "./api/keys";

/**
 * Production QueryClient factory — ADR-1/ADR-4 (R-XC-05): the retry policy
 * lives HERE so `main.tsx` is a single call and tests import the REAL config
 * (never a hand-copied duplicate — the blindness that hid the double-call bug).
 */
export function createQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // one retry at most, but NEVER for 4xx — auth/validation errors must reach the UI fast
        retry: (failureCount, error) =>
          !(
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          ) && failureCount < 1,
      },
    },
  });

  // per-resource lifetimes: positions are static, teams invalidate on every mutation
  queryClient.setQueryDefaults(queryKeys.positions, { staleTime: 10 * 60_000 });
  // R-XC-05 (TEAMS-ONLY): /teams fails fast — a failure produces exactly ONE
  // request, re-trigger is manual only (R-FBK-03). Key defaults beat the global
  // `retry` fn in the v5 merge order, so the non-teams policy above is untouched.
  queryClient.setQueryDefaults(queryKeys.teams, {
    staleTime: 60_000,
    retry: false,
  });

  return queryClient;
}
