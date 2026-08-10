// RSC — mostrado durante navegação enquanto a rota carrega.
import { Container } from '@/components/ui/container';

export default function Loading() {
  return (
    <Container className="py-16">
      <div className="space-y-4">
        <div className="h-8 w-2/3 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200" />
        <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      </div>
    </Container>
  );
}
