/**
 * Album Suspense fallback (R-FBK-01) — mirrors the real anatomy (design §3):
 * percentage bar ghost + two team-header ghosts + an 8-card pulse grid, so the
 * main screen never shows a blank frame while teams load or the lazy chunk
 * resolves (R-XC-04 `lazy(MainScreen)`).
 */
export default function AlbumSkeleton() {
  return (
    <div
      data-testid="album-skeleton"
      aria-hidden="true"
      className="flex animate-pulse flex-col gap-xl"
    >
      <div className="h-16 rounded-lg bg-surface-elevated" />
      <div className="h-10 rounded-md bg-surface-elevated" />
      <div className="h-10 rounded-md bg-surface-elevated" />
      <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="aspect-4/3 rounded-md bg-surface-elevated"
          />
        ))}
      </div>
    </div>
  );
}
