// RSC — detalhe do produto. Foco em SEO: metadata dinâmica + JSON-LD.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { getProduct } from '@/features/catalog/api';
import { formatBRL } from '@/features/catalog/lib';
import {
  BreadcrumbJsonLd,
  ProductJsonLd,
} from '@/features/catalog/components/product-json-ld';
import { HttpError } from '@/lib/errors';
import { env } from '@/config/env';

interface Props {
  params: Promise<{ slug: string }>;
}

async function safeGet(slug: string) {
  try {
    return await getProduct(slug);
  } catch (err) {
    if (HttpError.isHttpError(err) && err.status === 404) return null;
    throw err;
  }
}

// SEO — metadata dinâmica por produto
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await safeGet(slug);
  if (!product) return { title: 'Produto não encontrado' };

  const title = product.name;
  const description =
    product.description.length > 160
      ? `${product.description.slice(0, 157)}…`
      : product.description;
  const url = `/products/${product.slug}`;
  const primaryImage = product.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} · Petzo`,
      description,
      url,
      type: 'website',
      images: primaryImage ? [{ url: primaryImage }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await safeGet(slug);
  if (!product) notFound();

  const siteUrl = env.NEXT_PUBLIC_API_URL.replace(/\/$/, ''); // placeholder; em prod usaria NEXT_PUBLIC_SITE_URL
  const canonical = `${siteUrl}/products/${product.slug}`;

  return (
    <>
      <ProductJsonLd product={product} url={canonical} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Início', url: `${siteUrl}/` },
          { name: 'Produtos', url: `${siteUrl}/products` },
          {
            name: product.category.name,
            url: `${siteUrl}/categories/${product.category.slug}`,
          },
          { name: product.name, url: canonical },
        ]}
      />

      <Container className="py-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-neutral-500">
          <ol className="flex flex-wrap gap-2">
            <li>
              <Link href="/" className="hover:text-brand-600">
                Início
              </Link>
              <span aria-hidden className="mx-1">
                /
              </span>
            </li>
            <li>
              <Link href="/products" className="hover:text-brand-600">
                Produtos
              </Link>
              <span aria-hidden className="mx-1">
                /
              </span>
            </li>
            <li>
              <Link
                href={`/categories/${product.category.slug}`}
                className="hover:text-brand-600"
              >
                {product.category.name}
              </Link>
              <span aria-hidden className="mx-1">
                /
              </span>
            </li>
            <li className="text-neutral-900">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            {product.images.length > 0 ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.images[0]!.url}
                  alt={product.images[0]!.alt}
                  className="w-full rounded-lg border border-neutral-200 bg-white"
                />
                {product.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {product.images.slice(1).map((img) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={img.url}
                        src={img.url}
                        alt={img.alt}
                        className="aspect-square w-full rounded-md border border-neutral-200 bg-white object-cover"
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 text-6xl">
                🐾
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="text-sm text-neutral-500">{product.brand.name}</div>
            <h1 className="text-3xl font-bold text-neutral-900">{product.name}</h1>

            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-semibold text-neutral-900">
                {formatBRL(product.price)}
              </p>
              {product.available ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                  Em estoque
                </span>
              ) : (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                  Esgotado
                </span>
              )}
            </div>

            <p className="whitespace-pre-line text-neutral-700">{product.description}</p>

            <dl className="grid grid-cols-2 gap-3 border-t border-neutral-200 pt-4 text-sm">
              <div>
                <dt className="text-neutral-500">Categoria</dt>
                <dd className="text-neutral-900">
                  <Link
                    href={`/categories/${product.category.slug}`}
                    className="hover:text-brand-600"
                  >
                    {product.category.name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Marca</dt>
                <dd className="text-neutral-900">{product.brand.name}</dd>
              </div>
            </dl>
          </div>
        </div>
      </Container>
    </>
  );
}
