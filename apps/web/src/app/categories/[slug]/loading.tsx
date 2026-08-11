import { Container } from '@/components/ui/container';

export default function Loading() {
  return (
    <Container className="py-8">
      <div className="mb-6 h-8 w-52 animate-pulse rounded bg-neutral-200" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded bg-neutral-100" />
          ))}
        </aside>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      </div>
    </Container>
  );
}
