// RSC — JSON-LD schema.org/Product para SEO (Google Rich Results).
import type { Product } from '../types';

/**
 * Serializa JSON de forma segura para embutir em <script type="application/ld+json">.
 *
 * `JSON.stringify` NÃO escapa a sequência "</script>" — se `product.name`
 * contiver payload de fechamento de tag (cenário de admin malicioso ou dado
 * corrompido), o browser fecharia a tag e injetaria JS.
 *
 * Escapando os chars sensíveis (`<`, `>`, `&`, U+2028, U+2029) neutraliza a
 * superfície de XSS mantendo o JSON válido — parsers JSON (e o Google
 * Structured Data) aceitam essas escapes.
 */
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const LS_RE = new RegExp(LS, 'g');
const PS_RE = new RegExp(PS, 'g');

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LS_RE, '\\u2028')
    .replace(PS_RE, '\\u2029');
}

export function ProductJsonLd({ product, url }: { product: Product; url: string }) {
  const json = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand.name,
    },
    category: product.category.name,
    image: product.images.map((i) => i.url),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'BRL',
      price: (product.price / 100).toFixed(2),
      availability: product.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(json) }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const json = {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(json) }}
    />
  );
}
