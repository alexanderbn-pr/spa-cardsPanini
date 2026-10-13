import { LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import logoUrl from "@/assets/react.svg";
import { useAuthStore } from "@/stores/auth";

/**
 * Top bar — R-HDR-01/02/03 + R-RT-03: logo + "Stickers ligaE" + logout.
 * Rendered by App ONLY inside the `/stickers` route layout, never on
 * `/login` — visibility is route-driven, not token-driven.
 *
 * Logout (ADR-4 / R-RT-02): store clear FIRST (`logout()`), THEN
 * `navigate("/login")`. Reverse order renders `/login` with the token still
 * set → `RequireGuest` bounces back to `/stickers` (double-hop flicker).
 * Navigation lives here (single call site, YAGNI on a shared hook);
 * `stores/auth.ts` stays a leaf and never imports react-router.
 */
export default function Header() {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-10 h-16 border-b border-[var(--color-hairline)] bg-background">
      <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-between px-lg">
        <div className="flex items-center gap-sm">
          <img
            src={logoUrl}
            alt="Logo de Stickers ligaE"
            width={28}
            height={28}
            className="size-7 rounded-full"
          />
          <span className="text-lg font-medium tracking-[-1%] md:text-xl">
            Stickers ligaE
          </span>
        </div>

        <button
          type="button"
          aria-label="Cerrar sesión"
          onClick={handleLogout}
          className="grid size-11 place-items-center rounded-md text-muted-foreground transition-colors hover:text-white focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <LogOut size={20} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
