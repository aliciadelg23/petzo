import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { useAuthStore } from '@/features/auth/store';

export const cartKeys = { root: ['cart'] as const };

export function useCartQuery() {
  const isAuthed = useAuthStore((s) => s.user !== null);
  return useQuery({ queryKey: cartKeys.root, queryFn: api.getCart, enabled: isAuthed });
}

export function useAddCartMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addItem,
    onSuccess: (c) => qc.setQueryData(cartKeys.root, c),
  });
}
export function useUpdateCartItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.updateItem(itemId, quantity),
    onSuccess: (c) => qc.setQueryData(cartKeys.root, c),
  });
}
export function useRemoveCartItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.removeItem,
    onSuccess: (c) => qc.setQueryData(cartKeys.root, c),
  });
}
export function useClearCartMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.clearCart,
    onSuccess: (c) => qc.setQueryData(cartKeys.root, c),
  });
}
