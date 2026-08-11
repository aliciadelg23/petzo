'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { OrderStatus } from './types';

export const adminKeys = {
  metrics: ['admin', 'metrics'] as const,
  orders: (status?: OrderStatus) => ['admin', 'orders', status ?? 'all'] as const,
  customers: (search?: string) => ['admin', 'customers', search ?? ''] as const,
  inventory: (lowStock?: boolean) => ['admin', 'inventory', lowStock ?? false] as const,
};

export function useDashboardMetricsQuery() {
  return useQuery({
    queryKey: adminKeys.metrics,
    queryFn: api.getDashboardMetrics,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useAdminOrdersQuery(status?: OrderStatus) {
  return useQuery({
    queryKey: adminKeys.orders(status),
    queryFn: () => api.listAdminOrders({ limit: 50, ...(status ? { status } : {}) }),
  });
}

export function useTransitionOrderStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.transitionOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: adminKeys.metrics });
    },
  });
}

export function useAdminCustomersQuery(search?: string) {
  return useQuery({
    queryKey: adminKeys.customers(search),
    queryFn: () => api.listAdminCustomers({ limit: 50, ...(search ? { search } : {}) }),
  });
}

export function useAdminInventoryQuery(lowStock?: boolean) {
  return useQuery({
    queryKey: adminKeys.inventory(lowStock),
    queryFn: () => api.listAdminInventory({ limit: 100, ...(lowStock ? { lowStock: true } : {}) }),
  });
}

export function useUpdateInventoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      patch,
    }: {
      productId: string;
      patch: { quantity?: number; reorderPoint?: number };
    }) => api.updateAdminInventory(productId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'inventory'] });
      qc.invalidateQueries({ queryKey: adminKeys.metrics });
    },
  });
}
