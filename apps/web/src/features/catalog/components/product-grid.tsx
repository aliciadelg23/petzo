// RSC — grade + estado vazio.
import type { Product } from '../types';
import { ProductCard } from './product-card';

export function ProductGrid({ items }: { items: Product[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center">
        <span aria-hidden className="text-4xl">🔍</span>
        <p className="text-neutral-700">Nenhum produto encontrado com esses filtros.</p>
        <p className="text-sm text-neutral-500">
          Tente uma busca mais ampla ou remova alguns filtros.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
