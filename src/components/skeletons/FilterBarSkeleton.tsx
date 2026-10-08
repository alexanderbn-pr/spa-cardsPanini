/**
 * Filter-bar Suspense fallback (R-FBK-01) — five 56px field ghosts (design §3)
 * shown while the first `['teams]` + `['positions]` load suspends the filter
 * controls, keeping the section filled instead of blank.
 */
export default function FilterBarSkeleton() {
  return (
    <div
      data-testid="filter-bar-skeleton"
      aria-hidden="true"
      className="grid animate-pulse grid-cols-1 gap-md md:grid-cols-2 lg:flex lg:items-end"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="h-14 rounded-md bg-surface-elevated" />
      ))}
    </div>
  );
}
