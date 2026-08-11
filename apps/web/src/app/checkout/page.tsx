'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { useCartQuery } from '@/features/cart/hooks';
import { useCheckoutMutation } from '@/features/orders/hooks';
import { formatBRL } from '@/features/catalog/lib';
import { checkoutFormSchema, type CheckoutFormValues } from '@/features/checkout/schemas';
import { useToast } from '@/hooks/use-toast';
import { HttpError } from '@/lib/errors';

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCartQuery();
  const checkout = useCheckoutMutation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
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
      const msg =
        HttpError.isHttpError(err) && (err.status === 400 || err.status === 409)
          ? err.message
          : 'Não foi possível concluir o pedido.';
      toast({ kind: 'error', message: msg });
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
              <FormField label="Rótulo" error={errors.label?.message}>
                <Input {...register('label')} placeholder="Casa" />
              </FormField>
              <FormField label="CEP" error={errors.zip?.message}>
                <Input {...register('zip')} placeholder="00000-000" />
              </FormField>
              <div className="col-span-2">
                <FormField label="Rua" error={errors.street?.message}>
                  <Input {...register('street')} />
                </FormField>
              </div>
              <FormField label="Número" error={errors.number?.message}>
                <Input {...register('number')} />
              </FormField>
              <FormField label="Complemento" error={errors.complement?.message}>
                <Input {...register('complement')} />
              </FormField>
              <FormField label="Bairro" error={errors.district?.message}>
                <Input {...register('district')} />
              </FormField>
              <FormField label="Cidade" error={errors.city?.message}>
                <Input {...register('city')} />
              </FormField>
              <FormField label="UF" error={errors.state?.message}>
                <Input {...register('state')} maxLength={2} />
              </FormField>
            </div>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Cupom</h2>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <FormField
                label="Código (opcional)"
                error={errors.couponCode?.message}
                hint="Ex.: BEMVINDO10 (10% off em compras a partir de R$50)"
              >
                <Input {...register('couponCode')} placeholder="CÓDIGO" />
              </FormField>
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

            <Button type="submit" size="lg" className="mt-4 w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Finalizando…' : 'Finalizar compra'}
            </Button>
          </div>
        </aside>
      </form>
    </Container>
  );
}
