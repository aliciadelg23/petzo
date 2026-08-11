'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { CheckoutBody, Order, OrderListResponse } from './types';
import { cartKeys } from '@/features/cart/hooks';

export const orderKeys = {
  root: ['orders'] as const,
  list: (page: number, limit: number) => ['orders', 'list', page, limit] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
};

export function useOrdersQuery(page = 1, limit = 10) {
  return useQuery<OrderListResponse>({
    queryKey: orderKeys.list(page, limit),
    queryFn: () => api.listMyOrders(page, limit),
  });
}

export function useOrderQuery(id: string) {
  return useQuery<Order>({
    queryKey: orderKeys.detail(id),
    queryFn: () => api.getOrder(id),
    enabled: !!id,
  });
}

export function useCheckoutMutation() {
  const qc = useQueryClient();
  return useMutation<Order, Error, CheckoutBody>({
    mutationFn: (body) => api.checkout(body),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: orderKeys.root });
      qc.invalidateQueries({ queryKey: cartKeys.root });
      qc.setQueryData(orderKeys.detail(order.id), order);
    },
  });
}
