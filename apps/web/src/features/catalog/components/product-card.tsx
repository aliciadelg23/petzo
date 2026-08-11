// RSC — puro markup.
import Link from 'next/link';
import type { Product } from '../types';
import { formatBRL } from '../lib';
import { cn } from '@/lib/utils';

const SPECIES_LABEL: Record<Product['species'], string> = {
  DOG: 'Cães',
  CAT: 'Gatos',
  BIRD: 'Aves',
  RABBIT: 'Coelhos',
  FISH: 'Peixes',
  REPTILE: 'Répteis',
  RODENT: 'Roedores',
  OTHER: 'Outros',
};

export function ProductCard({ product }: { product: Product }) {
  const primary = product.images[0];
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square w-full bg-neutral-100">
        {primary ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primary.url}
            alt={primary.alt}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-neutral-300">🐾</div>
        )}
        {!product.available && (
          <span
            className={cn(
              'absolute right-2 top-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700',
            )}
          >
            Esgotado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>{SPECIES_LABEL[product.species]}</span>
          <span aria-hidden>·</span>
          <span>{product.brand.name}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-medium text-neutral-900 group-hover:text-brand-600">
          {product.name}
        </h3>
        <p className="mt-auto text-lg font-semibold text-neutral-900">
          {formatBRL(product.price)}
        </p>
      </div>
    </Link>
  );
}
