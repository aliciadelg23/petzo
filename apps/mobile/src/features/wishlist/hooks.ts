import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { useAuthStore } from '@/features/auth/store';

export const wishlistKeys = { root: ['wishlist'] as const };

export function useWishlistQuery() {
  const isAuthed = useAuthStore((s) => s.user !== null);
  return useQuery({
    queryKey: wishlistKeys.root,
    queryFn: api.getWishlist,
    enabled: isAuthed,
  });
}
export function useAddWishlistMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addToWishlist,
    onSuccess: (data) => qc.setQueryData(wishlistKeys.root, data),
  });
}
export function useRemoveWishlistMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.removeFromWishlist,
    onSuccess: (data) => qc.setQueryData(wishlistKeys.root, data),
  });
}
