'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartQuery } from '@/features/cart/hooks';
import { useCheckoutMutation } from '@/features/orders/hooks';
import { formatBRL } from '@/features/catalog/lib';
import { checkoutFormSchema, type CheckoutFormValues } from '@/features/checkout/schemas';
import { HttpError } from '@/lib/errors';

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCartQuery();
  const checkout = useCheckoutMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      label: 'Casa',
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: '',
      zip: '',
      couponCode: '',
    },
  });

  const onSubmit = async (values: CheckoutFormValues) => {
    const { couponCode, ...address } = values;
    try {
      const order = await checkout.mutateAsync({
        address,
        couponCode: couponCode?.trim() || undefined,
      });
      router.replace(`/checkout/sucesso/${order.id}`);
    } catch (err) {
      if (HttpError.isHttpError(err)) {
        if (err.status === 400 || err.status === 409) {
          setError('root', { message: err.message });
          return;
        }
      }
      setError('root', { message: 'Não foi possível concluir o pedido.' });
    }
  };

  if (cart.isPending) return null;
  if (!cart.data || cart.data.items.length === 0) {
    return (
      <Container className="py-16 text-center">
        <p className="text-neutral-700">Seu carrinho está vazio.</p>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-bold text-neutral-900">Checkout</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]"
      >
        <div className="space-y-4">
          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Endereço de entrega</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Rótulo" error={errors.label?.message}>
                <Input {...register('label')} placeholder="Casa" />
              </Field>
              <Field label="CEP" error={errors.zip?.message}>
                <Input {...register('zip')} placeholder="00000-000" />
              </Field>
              <div className="col-span-2">
                <Field label="Rua" error={errors.street?.message}>
                  <Input {...register('street')} />
                </Field>
              </div>
              <Field label="Número" error={errors.number?.message}>
                <Input {...register('number')} />
              </Field>
              <Field label="Complemento" error={errors.complement?.message}>
                <Input {...register('complement')} />
              </Field>
              <Field label="Bairro" error={errors.district?.message}>
                <Input {...register('district')} />
              </Field>
              <Field label="Cidade" error={errors.city?.message}>
                <Input {...register('city')} />
              </Field>
              <Field label="UF" error={errors.state?.message}>
                <Input {...register('state')} maxLength={2} />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Cupom</h2>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <Field
                label="Código (opcional)"
                error={errors.couponCode?.message}
                hint="Ex.: BEMVINDO10 (10% off em compras a partir de R$50)"
              >
                <Input {...register('couponCode')} placeholder="CÓDIGO" />
              </Field>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Resumo do pedido</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-600">Subtotal</dt>
                <dd className="font-medium text-neutral-900">{formatBRL(cart.data.subtotal)}</dd>
              </div>
              <p className="pt-2 text-xs text-neutral-500">
                Frete, desconto e total finais são calculados pelo servidor.
              </p>
            </dl>

            {errors.root && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {errors.root.message}
              </p>
            )}

            <Button type="submit" size="lg" className="mt-4 w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Finalizando…' : 'Finalizar compra'}
            </Button>
          </div>
        </aside>
      </form>
    </Container>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium uppercase tracking-wide text-neutral-600">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
