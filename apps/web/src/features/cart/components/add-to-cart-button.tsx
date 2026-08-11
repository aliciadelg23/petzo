'use client';

// CLIENT — ilha interativa embutida na página RSC de detalhe do produto.

import { useRouter } from 'next/navigation';
import { useAddToCartMutation } from '../hooks';
import { useAuthStore } from '@/features/auth/store';
import { Button } from '@/components/ui/button';
import { HttpError } from '@/lib/errors';
import { useState } from 'react';

interface Props {
  productId: string;
  disabled?: boolean;
}

export function AddToCartButton({ productId, disabled }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const mutation = useAddToCartMutation();
  const [message, setMessage] = useState<string | null>(null);

  const onClick = async () => {
    if (!user) {
      router.push(`/entrar?redirect=/products`);
      return;
    }
    setMessage(null);
    try {
      await mutation.mutateAsync({ productId, quantity: 1 });
      setMessage('Adicionado ao carrinho ✓');
    } catch (err) {
      if (HttpError.isHttpError(err) && err.status === 409) {
        setMessage(err.message);
      } else {
        setMessage('Não foi possível adicionar.');
      }
    }
  };

  return (
    <div className="space-y-2">
      <Button size="lg" onClick={onClick} disabled={disabled || mutation.isPending}>
        {mutation.isPending ? 'Adicionando…' : 'Adicionar ao carrinho'}
      </Button>
      {message && (
        <p role="status" className="text-sm text-neutral-700">
          {message}
        </p>
      )}
    </div>
  );
}
