import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./styles/globals.css";
import App from "./App.tsx";
import { ApiError } from "./lib/api/client";
import { queryKeys } from "./lib/api/keys";

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
queryClient.setQueryDefaults(queryKeys.teams, { staleTime: 60_000 });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
