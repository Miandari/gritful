// Rendered instantly by Next.js while the async dashboard page is still
// fetching data on the server. Shape approximates the real layout so there
// is no jarring layout shift when the content streams in.
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="space-y-3">
        <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-5 w-80 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: today's progress + active challenges */}
        <div className="space-y-6 lg:col-span-2">
          {/* Today's Progress card */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 h-6 w-40 animate-pulse rounded-md bg-muted" />
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          </div>

          {/* Active Challenges heading */}
          <div>
            <div className="mb-4 h-7 w-48 animate-pulse rounded-md bg-muted" />
            <div className="grid gap-4 md:grid-cols-2">
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 h-6 w-32 animate-pulse rounded-md bg-muted" />
            <div className="space-y-4">
              <StatsRowSkeleton />
              <StatsRowSkeleton />
              <StatsRowSkeleton />
              <StatsRowSkeleton />
            </div>
          </div>

          {/* Track Today button */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-3 h-6 w-3/4 animate-pulse rounded-md bg-muted" />
      <div className="mb-4 h-4 w-1/2 animate-pulse rounded bg-muted" />
      <div className="flex gap-2">
        <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}

function StatsRowSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-5 w-12 animate-pulse rounded bg-muted" />
    </div>
  );
}
