// RSC — skeleton enquanto o RSC de /products refetcha.
import { Container } from '@/components/ui/container';

function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="aspect-square animate-pulse bg-neutral-200" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
        <div className="mt-auto h-6 w-1/2 animate-pulse rounded bg-neutral-200" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <Container className="py-8">
      <div className="mb-6 h-9 w-40 animate-pulse rounded bg-neutral-200" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded bg-neutral-100" />
          ))}
        </aside>
        <div>
          <div className="mb-4 flex justify-end">
            <div className="h-9 w-40 animate-pulse rounded bg-neutral-200" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
