'use client';

// CLIENT — TanStack Query lida com todo o server state do carrinho.
// Zustand NÃO é necessário aqui: a cache do Query já é a única fonte da verdade.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { Cart } from './types';
import { useAuthStore } from '@/features/auth/store';

export const cartKeys = {
  root: ['cart'] as const,
};

export function useCartQuery() {
  const isAuthed = useAuthStore((s) => s.user !== null);
  return useQuery<Cart>({
    queryKey: cartKeys.root,
    queryFn: api.getMyCart,
    enabled: isAuthed,
    staleTime: 30_000,
  });
}

export function useAddToCartMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addToCart,
    onSuccess: (cart) => qc.setQueryData(cartKeys.root, cart),
  });
}

export function useUpdateCartItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.updateCartItem(itemId, quantity),
    onSuccess: (cart) => qc.setQueryData(cartKeys.root, cart),
  });
}

export function useRemoveCartItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.removeCartItem,
    onSuccess: (cart) => qc.setQueryData(cartKeys.root, cart),
  });
}

export function useClearCartMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.clearCart,
    onSuccess: (cart) => qc.setQueryData(cartKeys.root, cart),
  });
}
