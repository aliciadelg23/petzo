import { Container } from '@/components/ui/container';

// RSC — conteúdo estático.
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-neutral-50 py-8">
      <Container className="flex flex-col items-start justify-between gap-4 text-sm text-neutral-600 sm:flex-row sm:items-center">
        <p>© {year} Petzo — projeto de portfólio.</p>
        <p>
          Construído com{' '}
          <a
            className="underline underline-offset-2 hover:text-brand-600"
            href="https://nextjs.org"
            target="_blank"
            rel="noreferrer noopener"
          >
            Next.js
          </a>
          {' '}+ React + TypeScript.
        </p>
      </Container>
    </footer>
  );
}
