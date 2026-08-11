// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { ProductCard } from './product-card';
import type { Product } from '../types';

const BASE: Product = {
  id: 'p1',
  slug: 'racao-caes-15kg',
  name: 'Ração Cães 15kg',
  description: 'x',
  price: 12345, // R$ 123,45
  species: 'DOG',
  active: true,
  available: true,
  category: { id: 'c1', name: 'Ração', slug: 'racao' },
  brand: { id: 'b1', name: 'GoldenBite', slug: 'golden-bite' },
  images: [{ url: 'https://placehold.co/1', alt: 'foto', position: 0 }],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('ProductCard', () => {
  it('mostra nome, marca e preço formatado em BRL', () => {
    renderWithProviders(<ProductCard product={BASE} />);
    expect(screen.getByText('Ração Cães 15kg')).toBeInTheDocument();
    expect(screen.getByText('GoldenBite')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*123,45/)).toBeInTheDocument();
  });

  it('renderiza badge "Esgotado" quando available=false', () => {
    renderWithProviders(<ProductCard product={{ ...BASE, available: false }} />);
    expect(screen.getByText('Esgotado')).toBeInTheDocument();
  });

  it('sem imagem → placeholder emoji', () => {
    renderWithProviders(<ProductCard product={{ ...BASE, images: [] }} />);
    // Não há alt de imagem; o emoji é aria-hidden mas o texto está no DOM
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('link direciona para /products/:slug', () => {
    renderWithProviders(<ProductCard product={BASE} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/products/racao-caes-15kg');
  });
});
