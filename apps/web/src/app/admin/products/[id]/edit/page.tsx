'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProduct, listBrands, listCategories } from '@/features/catalog/api';
import { ProductForm, type ProductFormValues } from '@/features/admin/components/product-form';
import { softDeleteProduct, updateProduct } from '@/features/admin/products-api';
import { Button } from '@/components/ui/button';
import { HttpError } from '@/lib/errors';

export default function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();

  const product = useQuery({
    queryKey: ['admin', 'products', 'detail', id],
    queryFn: () => getProduct(id),
  });
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => listCategories() });
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => listBrands() });

  const updateMut = useMutation({
    mutationFn: (values: ProductFormValues) =>
      updateProduct(id, {
        name: values.name,
        slug: values.slug?.trim() ? values.slug : undefined,
        description: values.description,
        categoryId: values.categoryId,
        brandId: values.brandId,
        species: values.species,
        price: values.priceCents,
        active: values.active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => softDeleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      router.replace('/admin/products');
    },
  });

  if (product.isPending || categories.isPending || brands.isPending) {
    return <div className="h-64 animate-pulse rounded bg-neutral-100" />;
  }
  if (!product.data || !categories.data || !brands.data) {
    return <p className="text-sm text-red-700">Falha ao carregar dados.</p>;
  }

  const onSubmit = async (values: ProductFormValues) => {
    try {
      await updateMut.mutateAsync(values);
      alert('Produto atualizado.');
    } catch (err) {
      if (HttpError.isHttpError(err)) alert(err.message);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold">Editar produto</h2>
      <ProductForm
        initialValues={{
          name: product.data.name,
          slug: product.data.slug,
          description: product.data.description,
          categoryId: product.data.category.id,
          brandId: product.data.brand.id,
          species: product.data.species,
          priceCents: product.data.price,
          active: product.data.active,
        }}
        categories={categories.data.items}
        brands={brands.data.items}
        submitLabel="Salvar alterações"
        onSubmit={onSubmit}
      />

      <section className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="text-sm font-semibold text-red-800">Zona perigosa</h3>
        <p className="mt-1 text-xs text-red-700">
          Soft-delete: o produto some do storefront mas ordens antigas preservam integridade.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 border-red-300 text-red-700"
          onClick={() => {
            if (confirm('Confirmar remoção (soft-delete)?')) deleteMut.mutate();
          }}
          disabled={deleteMut.isPending}
        >
          Excluir produto
        </Button>
      </section>
    </div>
  );
}
