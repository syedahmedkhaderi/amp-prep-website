/**
 * Placeholder shown while a runner route resolves.
 *
 * The runner pages load an attempt and its questions from the database before
 * rendering anything, so without this the browser sits on the previous page and
 * a slow load looks like a dead click. Mirrors the real layout so the content
 * does not jump when it arrives.
 */
export function RunnerSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your questions...</span>

      <div className="flex items-center justify-between">
        <div className="h-4 w-32 animate-pulse rounded bg-surface-panel" />
        <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-panel" />
      </div>

      <div className="mt-6 h-2 w-full animate-pulse rounded-full bg-surface-panel" />

      <div className="mt-8 rounded-xl border border-surface-border bg-white p-6">
        <div className="h-4 w-24 animate-pulse rounded bg-surface-panel" />
        <div className="mt-4 space-y-3">
          <div className="h-5 w-full animate-pulse rounded bg-surface-panel" />
          <div className="h-5 w-4/5 animate-pulse rounded bg-surface-panel" />
        </div>

        <div className="mt-8 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 w-full animate-pulse rounded-lg border border-surface-border bg-surface-panel/60"
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <div className="h-10 w-24 animate-pulse rounded-lg bg-surface-panel" />
        <div className="h-10 w-24 animate-pulse rounded-lg bg-surface-panel" />
      </div>
    </div>
  );
}
