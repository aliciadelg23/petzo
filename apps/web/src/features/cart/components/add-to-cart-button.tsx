'use client';

/**
 * CLIENT — ilha interativa embutida na página RSC de detalhe do produto.
 *
 * Decisão: feedback vira TOAST via Context (não mais state local).
 * Antes: cada consumidor de mutation mantinha `message` em useState — 4+ cópias
 * do mesmo padrão. Agora um único hook `useToast()` cuida disso.
 */
import { useRouter } from 'next/navigation';
import { useAddToCartMutation } from '../hooks';
import { useAuthStore } from '@/features/auth/store';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { HttpError } from '@/lib/errors';

interface Props {
  productId: string;
  disabled?: boolean;
}

export function AddToCartButton({ productId, disabled }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const mutation = useAddToCartMutation();
  const { toast } = useToast();

  const onClick = async () => {
    if (!user) {
      router.push(`/entrar?redirect=/products`);
      return;
    }
    try {
      await mutation.mutateAsync({ productId, quantity: 1 });
      toast({ kind: 'success', message: 'Adicionado ao carrinho.' });
    } catch (err) {
      if (HttpError.isHttpError(err) && err.status === 409) {
        toast({ kind: 'error', message: err.message });
      } else {
        toast({ kind: 'error', message: 'Não foi possível adicionar.' });
      }
    }
  };

  return (
    <Button size="lg" onClick={onClick} disabled={disabled || mutation.isPending}>
      {mutation.isPending ? 'Adicionando…' : 'Adicionar ao carrinho'}
    </Button>
  );
}
