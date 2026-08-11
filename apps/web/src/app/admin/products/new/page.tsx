'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listBrands, listCategories } from '@/features/catalog/api';
import { ProductForm, type ProductFormValues } from '@/features/admin/components/product-form';
import { createProduct } from '@/features/admin/products-api';
import { HttpError } from '@/lib/errors';

export default function AdminProductNewPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => listCategories() });
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => listBrands() });

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      createProduct({
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
      qc.invalidateQueries({ queryKey: ['admin', 'products', 'list'] });
    },
  });

  if (categories.isPending || brands.isPending) {
    return <div className="h-64 animate-pulse rounded bg-neutral-100" />;
  }
  if (!categories.data || !brands.data) {
    return <p className="text-sm text-red-700">Falha ao carregar categorias/marcas.</p>;
  }

  const onSubmit = async (values: ProductFormValues) => {
    try {
      const created = await mutation.mutateAsync(values);
      router.replace(`/admin/products/${created.id}/edit`);
    } catch (err) {
      if (HttpError.isHttpError(err)) alert(err.message);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-xl font-semibold">Novo produto</h2>
      <ProductForm
        initialValues={{
          name: '',
          slug: '',
          description: '',
          categoryId: '',
          brandId: '',
          species: 'DOG',
          priceCents: 1000,
          active: true,
        }}
        categories={categories.data.items}
        brands={brands.data.items}
        submitLabel="Criar produto"
        onSubmit={onSubmit}
      />
    </div>
  );
}
