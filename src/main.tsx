import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";

import "./styles/globals.css";
import App from "./App.tsx";
import { createQueryClient } from "./lib/queryClient";

/**
 * R-XC-05: the client (global retry policy + teams `retry: false`, ADR-1)
 * is built by `createQueryClient()` so tests exercise the SAME production
 * config (ADR-4) — see `src/lib/queryClient.ts`.
 */
const queryClient = createQueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
