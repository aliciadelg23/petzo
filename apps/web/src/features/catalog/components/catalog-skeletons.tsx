// RSC — skeletons de fallback para Suspense em /products.
// Cada boundary tem seu skeleton dedicado: sidebar e grid streamam separados.

export function FiltersSkeleton() {
  return (
    <aside className="space-y-4" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded bg-neutral-100" />
      ))}
    </aside>
  );
}

export function ProductsSkeleton() {
  return (
    <div>
      <div className="mb-4 flex justify-between">
        <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
        <div className="h-9 w-40 animate-pulse rounded bg-neutral-200" />
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <div className="aspect-square animate-pulse bg-neutral-200" />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-200" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
              <div className="mt-auto h-6 w-1/2 animate-pulse rounded bg-neutral-200" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
