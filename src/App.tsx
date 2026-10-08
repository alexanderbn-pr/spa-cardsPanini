import { lazy, Suspense, useState } from "react";
import { useLocation } from "react-router";
import { BrowserRouter, Route, Routes } from "react-router";
import { PATHS, RequireAuth, RequireGuest, RootRedirect } from "@/app/routes";
import ErrorModal from "@/components/error-modal/ErrorModal";
import RouteErrorBoundary from "@/components/error-boundary/RouteErrorBoundary";
import AlbumSkeleton from "@/components/skeletons/AlbumSkeleton";
import FiltersSection from "@/features/filters/FiltersSection";
import type { AppliedFilters } from "@/types/filters";
import Header from "@/features/header/Header";
import LoginScreen from "@/features/auth/LoginScreen";

/**
 * Heavy album chunk — dynamic import per R-XC-04/design §4; the Suspense
 * boundary below covers the import frame with `AlbumSkeleton` (R-FBK-01).
 */
const MainScreen = lazy(() => import("@/features/stickers/MainScreen"));

/**
 * Composition root — R-RT-01 (supersedes R-AUTH-07): screens are gated by
 * URL routes + guards (`src/app/routes.tsx`), NOT by a `token ? … : …` state
 * branch — that branch is DELETED so the token has exactly ONE enforcement
 * point (ADR-2/3, proposal R3). R-HDR-02: the header lives inside the
 * `/stickers` layout so it can never appear on the login route.
 *
 * State ownership (design §5): `appliedFilters` lives HERE — it enters the
 * `/stickers` query key only when "Aplicar filtros" clicks (R-FLT-02); drafts
 * stay inside FiltersSection. FiltersSection and the album are SIBLINGS
 * (design §6: features never import features — composition happens here).
 *
 * `ErrorModal` is mounted in BOTH layouts (R-RT-04 / R-FBK-02): non-field-
 * mapped API failures must surface on `/login` too, while field-mapped 400s
 * (R-AUTH-03) never reach the ui store and therefore never open it.
 */
export function AppRoutes() {
  const [applied, setApplied] = useState<AppliedFilters | null>(null);
  const { pathname } = useLocation();

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
      <Route
        path={PATHS.login}
        element={
          <RequireGuest>
            <LoginScreen />
            <ErrorModal />
          </RequireGuest>
        }
      />
      <Route
        path={PATHS.stickers}
        element={
          <RequireAuth>
            <div className="flex min-h-svh flex-col bg-background">
              <Header />
              <main
                data-testid="main-screen"
                className="mx-auto w-full max-w-[1200px] px-lg py-xl"
              >
                <RouteErrorBoundary resetKey={pathname}>
                  <FiltersSection applied={applied} onApply={setApplied} />
                  <Suspense fallback={<AlbumSkeleton />}>
                    <MainScreen applied={applied} />
                  </Suspense>
                </RouteErrorBoundary>
              </main>
              <ErrorModal />
            </div>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

/**
 * `BrowserRouter` (ADR-1: react-router v7 declarative mode — real paths,
 * no hash) wraps the routes; `AppRoutes` is the named test seam so tests can
 * mount the SAME tree inside a `MemoryRouter` (R-RT-06, design §Testing).
 */
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
