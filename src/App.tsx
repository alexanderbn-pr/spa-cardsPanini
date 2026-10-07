import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * App shell — providers, router and the global error modal are slots
 * wired in future changes (src/app/, src/components/error-modal.tsx).
 */
export default function App() {
  return (
    <main className={cn("flex min-h-svh flex-col gap-4 p-6")}>
      <h1 className="text-xl font-semibold">SPA Cards Panini</h1>
      <Button type="button" className="self-start">
        Comenzar
      </Button>
    </main>
  );
}
