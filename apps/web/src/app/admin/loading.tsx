export default function Loading() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-40 animate-pulse rounded bg-neutral-200" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-neutral-100" />
    </div>
  );
}
