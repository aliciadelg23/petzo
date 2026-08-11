'use client';

// CLIENT — server state via TanStack Query; sem RSC porque tudo aqui é per-user.

import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import {
  useCartQuery,
  useClearCartMutation,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '@/features/cart/hooks';
import { formatBRL } from '@/features/catalog/lib';

export default function CarrinhoPage() {
  const cart = useCartQuery();
  const removeItem = useRemoveCartItemMutation();
  const updateItem = useUpdateCartItemMutation();
  const clearCart = useClearCartMutation();

  if (cart.isPending) {
    return (
      <Container className="py-12">
        <div className="h-8 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="mt-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded bg-neutral-100" />
          ))}
        </div>
      </Container>
    );
  }

  if (cart.isError || !cart.data) {
    return (
      <Container className="py-12">
        <p className="text-red-700">Não foi possível carregar o carrinho.</p>
      </Container>
    );
  }

  const { items, subtotal, itemCount } = cart.data;

  if (items.length === 0) {
    return (
      <Container className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-12 text-center">
        <span aria-hidden className="text-5xl">🛒</span>
        <h1 className="text-2xl font-semibold text-neutral-900">Seu carrinho está vazio</h1>
        <p className="text-neutral-600">Explore o catálogo e adicione produtos.</p>
        <Link href="/products">
          <Button>Ver produtos</Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-bold text-neutral-900">Meu carrinho</h1>
      <p className="text-sm text-neutral-600">
        {itemCount} {itemCount === 1 ? 'item' : 'itens'}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {items.map((it) => (
            <li key={it.id} className="flex items-start gap-4 p-4">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-neutral-100">
                {it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl">🐾</div>
                )}
              </div>
              <div className="flex-1">
                <Link
                  href={`/products/${it.slug}`}
                  className="text-sm font-medium text-neutral-900 hover:text-brand-600"
                >
                  {it.name}
                </Link>
                <p className="text-xs text-neutral-500">{formatBRL(it.unitPrice)} un.</p>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() =>
                      updateItem.mutate({ itemId: it.id, quantity: Math.max(1, it.quantity - 1) })
                    }
                    disabled={updateItem.isPending || it.quantity <= 1}
                    className="h-7 w-7 rounded border border-neutral-300 disabled:opacity-50"
                    aria-label="Diminuir"
                  >
                    −
                  </button>
                  <span aria-label="Quantidade" className="min-w-8 text-center font-medium">
                    {it.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateItem.mutate({ itemId: it.id, quantity: it.quantity + 1 })
                    }
                    disabled={updateItem.isPending || it.quantity >= it.availableStock}
                    className="h-7 w-7 rounded border border-neutral-300 disabled:opacity-50"
                    aria-label="Aumentar"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem.mutate(it.id)}
                    disabled={removeItem.isPending}
                    className="ml-auto text-xs text-red-600 hover:underline"
                  >
                    Remover
                  </button>
                </div>
              </div>
              <div className="text-right font-semibold text-neutral-900">
                {formatBRL(it.lineTotal)}
              </div>
            </li>
          ))}
        </ul>

        <aside className="space-y-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Resumo</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-600">Subtotal</dt>
                <dd className="font-medium text-neutral-900">{formatBRL(subtotal)}</dd>
              </div>
              <p className="text-xs text-neutral-500">
                Frete e descontos serão calculados no checkout.
              </p>
            </dl>
            <Link href="/checkout" className="mt-4 block">
              <Button size="lg" className="w-full">
                Ir para checkout
              </Button>
            </Link>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => clearCart.mutate()}
            disabled={clearCart.isPending}
          >
            Esvaziar carrinho
          </Button>
        </aside>
      </div>
    </Container>
  );
}
