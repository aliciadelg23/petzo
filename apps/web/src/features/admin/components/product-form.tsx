'use client';

// CLIENT — form compartilhado por create/edit. RHF + Zod resolver.
// Mantém apenas os campos essenciais; imagens e inventário criam-se com defaults
// na criação (backend faz o work).

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const productFormSchema = z.object({
  name: z.string().min(1, 'Informe o nome.').max(200),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug em kebab-case (letras minúsculas, dígitos, hífen).')
    .max(200)
    .optional()
    .or(z.literal('')),
  description: z.string().min(1, 'Descrição obrigatória.').max(5000),
  categoryId: z.string().min(1, 'Categoria obrigatória.'),
  brandId: z.string().min(1, 'Marca obrigatória.'),
  species: z.enum(['DOG', 'CAT', 'BIRD', 'RABBIT', 'FISH', 'REPTILE', 'RODENT', 'OTHER']),
  priceCents: z.coerce.number().int().nonnegative().max(1_000_000_00),
  active: z.boolean().default(true),
});
export type ProductFormValues = z.infer<typeof productFormSchema>;

interface Props {
  initialValues: ProductFormValues;
  categories: { id: string; name: string; slug: string }[];
  brands: { id: string; name: string; slug: string }[];
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => Promise<void> | void;
}

export function ProductForm({ initialValues, categories, brands, submitLabel, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialValues,
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4"
    >
      <FieldRow label="Nome" error={errors.name?.message}>
        <Input {...register('name')} />
      </FieldRow>

      <FieldRow
        label="Slug (opcional; gerado do nome se vazio)"
        error={errors.slug?.message}
      >
        <Input {...register('slug')} placeholder="racao-premium-caes-adultos" />
      </FieldRow>

      <FieldRow label="Descrição" error={errors.description?.message}>
        <textarea
          {...register('description')}
          rows={4}
          className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm"
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Categoria" error={errors.categoryId?.message}>
          <select
            {...register('categoryId')}
            className="h-10 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm"
          >
            <option value="">— selecione —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="Marca" error={errors.brandId?.message}>
          <select
            {...register('brandId')}
            className="h-10 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm"
          >
            <option value="">— selecione —</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="Espécie" error={errors.species?.message}>
          <select
            {...register('species')}
            className="h-10 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm"
          >
            {['DOG', 'CAT', 'BIRD', 'RABBIT', 'FISH', 'REPTILE', 'RODENT', 'OTHER'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="Preço (centavos)" error={errors.priceCents?.message}>
          <Input type="number" {...register('priceCents')} />
        </FieldRow>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register('active')} />
        Produto ativo
      </label>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando…' : submitLabel}
      </Button>
    </form>
  );
}

function FieldRow({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium uppercase tracking-wide text-neutral-600">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
