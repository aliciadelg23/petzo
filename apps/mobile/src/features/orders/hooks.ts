import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { cartKeys } from '@/features/cart/hooks';

export const orderKeys = {
  list: ['orders', 'list'] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
};

export function useOrdersQuery() {
  return useQuery({ queryKey: orderKeys.list, queryFn: () => api.listOrders() });
}
export function useOrderQuery(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => api.getOrder(id),
    enabled: !!id,
  });
}
export function useCheckoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.checkout,
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: orderKeys.list });
      qc.setQueryData(orderKeys.detail(order.id), order);
      qc.invalidateQueries({ queryKey: cartKeys.root });
    },
  });
}
