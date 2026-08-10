// RSC — Root Layout. Server Component por padrão.
// Só delega ao <Providers> (client) o wrapper de contextos do browser.

import type { Metadata, Viewport } from 'next';
import { Providers } from '@/providers';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: {
    default: 'Petzo — E-commerce para pets',
    template: '%s · Petzo',
  },
  description:
    'Petzo é uma loja online de produtos para pets: ração, brinquedos, higiene, medicamentos e acessórios.',
  applicationName: 'Petzo',
  keywords: ['pet', 'e-commerce', 'ração', 'produtos para pets', 'petshop'],
  authors: [{ name: 'aliciadelg23' }],
  openGraph: {
    title: 'Petzo — E-commerce para pets',
    description: 'Produtos para o seu pet, do brinquedo à ração.',
    locale: 'pt_BR',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#f26621',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col antialiased">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
