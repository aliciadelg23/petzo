import { Container } from '@/components/ui/container';

export default function Loading() {
  return (
    <Container className="py-8">
      <div className="mb-4 h-4 w-64 animate-pulse rounded bg-neutral-200" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-lg bg-neutral-100" />
        <div className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-neutral-200" />
          <div className="h-10 w-40 animate-pulse rounded bg-neutral-200" />
          <div className="space-y-2 pt-4">
            <div className="h-3 w-full animate-pulse rounded bg-neutral-100" />
            <div className="h-3 w-full animate-pulse rounded bg-neutral-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
      </div>
    </Container>
  );
}
