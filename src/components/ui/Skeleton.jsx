// Loading skeletons.
//
// These exist so navigation feels instant. Every route is force-dynamic and
// queries the database before it can render; without a Suspense boundary the
// App Router blocks on the server and the browser shows the *previous* page,
// unchanged, until all the data arrives. Clicking a nav item appeared to do
// nothing at all. A loading.js gives Next somewhere to stream into immediately,
// so the shell paints on click and the data fills in behind it.
//
// Shapes deliberately mirror the real content's dimensions — a skeleton that
// reflows into something a different size reads as a glitch rather than a load.

function Bar({ className = "" }) {
  return (
    <div
      className={`bg-surface-container-high/70 rounded-md animate-pulse ${className}`}
    />
  );
}

// Page title + subtitle, matching the heading block every page opens with.
export function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Bar className="h-8 w-64 max-w-[70%]" />
      <Bar className="h-5 w-96 max-w-[90%]" />
    </div>
  );
}

// Stat tiles. `count` matches the grid the real page renders.
export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 gap-gutter ${
        count === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
      }`}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-[var(--shadow-e1)] flex flex-col gap-3"
        >
          <div className="flex justify-between items-start gap-3">
            <Bar className="h-3 w-28" />
            <Bar className="h-8 w-8 rounded-lg" />
          </div>
          <Bar className="h-10 w-20" />
        </div>
      ))}
    </div>
  );
}

// Card-wrapped table. Rows are staggered in opacity so the block reads as
// "loading" rather than as a solid grey slab.
export function TableSkeleton({ rows = 6, columns = 5, withTabs = false }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-outline-variant/30 flex flex-col overflow-hidden">
      {withTabs ? (
        <div className="px-2 pt-2 border-b border-outline-variant/30 flex gap-1">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="px-4 py-3">
              <Bar className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="px-6 py-3 border-b border-outline-variant/30 bg-surface-container-low/60 flex gap-6">
        {Array.from({ length: columns }, (_, i) => (
          <Bar key={i} className="h-3 flex-1" />
        ))}
      </div>

      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="px-6 py-4 border-b border-outline-variant/20 last:border-b-0 flex gap-6 items-center"
          // Fading successive rows suggests depth and keeps the eye at the top,
          // where real content appears first.
          style={{ opacity: 1 - r * 0.12 }}
        >
          {Array.from({ length: columns }, (_, c) => (
            <Bar key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Filter/search bar that sits above most tables.
export function FiltersSkeleton({ fields = 4 }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-outline-variant/30 p-4 flex flex-wrap items-end gap-3">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Bar className="h-3 w-16" />
          <Bar className="h-10 w-40 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default Bar;
