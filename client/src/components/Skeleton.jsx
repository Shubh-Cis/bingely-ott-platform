// Loading placeholders that match the real layout, so the page doesn't flash empty.
export function PosterSkeleton() {
  return <div className="skeleton aspect-[3/2] w-72 shrink-0 rounded-2xl sm:w-80" />;
}

export function RailSkeleton({ title }) {
  return (
    <section className="mb-8">
      {title && <div className="skeleton mb-3 h-5 w-44 rounded" />}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <PosterSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function HeroSkeleton() {
  return <div className="skeleton mb-10 h-[60vh] min-h-[420px] w-full rounded-3xl" />;
}
