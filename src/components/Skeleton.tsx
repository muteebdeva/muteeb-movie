interface SkeletonRowProps {
  title: string;
  count?: number;
}

export function SkeletonRow({ title, count = 6 }: SkeletonRowProps) {
  return (
    <section className="mb-8 md:mb-10" aria-label={`Loading ${title}`}>
      <div className="px-4 sm:px-6 lg:px-10 mb-4">
        <div className="h-6 w-48 rounded bg-zinc-800 skeleton-shimmer" />
      </div>
      <div className="flex gap-3 md:gap-4 overflow-hidden px-4 sm:px-6 lg:px-10">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-[160px] sm:w-[180px] md:w-[200px] shrink-0">
            <div className="aspect-[2/3] rounded-lg bg-zinc-800 skeleton-shimmer" />
            <div className="mt-2 h-4 w-3/4 rounded bg-zinc-800 skeleton-shimmer" />
            <div className="mt-1.5 h-3 w-1/2 rounded bg-zinc-800 skeleton-shimmer" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function SkeletonHero() {
  return (
    <div className="relative h-[70vh] min-h-[500px] w-full" aria-hidden="true">
      <div className="absolute inset-0 bg-zinc-900 skeleton-shimmer" />
      <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 lg:px-10 pb-12 md:pb-16">
        <div className="h-5 w-40 rounded bg-zinc-800 skeleton-shimmer mb-3" />
        <div className="h-12 w-2/3 max-w-xl rounded bg-zinc-800 skeleton-shimmer mb-4" />
        <div className="h-4 w-1/2 max-w-lg rounded bg-zinc-800 skeleton-shimmer mb-6" />
        <div className="flex gap-3">
          <div className="h-12 w-32 rounded-lg bg-zinc-800 skeleton-shimmer" />
          <div className="h-12 w-32 rounded-lg bg-zinc-800 skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
