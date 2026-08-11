import { http } from '@/lib/http';
import type {
  AdminCustomerListResponse,
  AdminInventoryListResponse,
  AdminOrder,
  AdminOrderListResponse,
  DashboardMetrics,
  OrderStatus,
} from './types';

export function getDashboardMetrics(): Promise<DashboardMetrics> {
  return http<DashboardMetrics>('/admin/dashboard/metrics');
}

export function listAdminOrders(params: {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}): Promise<AdminOrderListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  return http<AdminOrderListResponse>(`/admin/orders${suffix}`);
}

export function transitionOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<{ id: string; status: OrderStatus }> {
  return http(`/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export function listAdminCustomers(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminCustomerListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  const suffix = qs.toString() ? `?${qs}` : '';
  return http<AdminCustomerListResponse>(`/admin/customers${suffix}`);
}

export function listAdminInventory(params: {
  page?: number;
  limit?: number;
  lowStock?: boolean;
}): Promise<AdminInventoryListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.lowStock) qs.set('lowStock', 'true');
  const suffix = qs.toString() ? `?${qs}` : '';
  return http<AdminInventoryListResponse>(`/admin/inventory${suffix}`);
}

export function updateAdminInventory(
  productId: string,
  patch: { quantity?: number; reorderPoint?: number },
): Promise<{ productId: string; quantity: number; reserved: number; reorderPoint: number }> {
  return http(`/admin/inventory/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: patch,
  });
}

/**
 * Detalhe do pedido para admin — reusa GET /orders/:id (funciona porque backend
 * na verdade limita por owner). Como admin/staff, precisamos de outro endpoint.
 * Aqui usamos a listagem admin com filtro por status para achar o item específico
 * — não ideal, mas suficiente para o escopo desta fase.
 * Preferencial: adicionar GET /admin/orders/:id no futuro.
 */
export function getAdminOrderById(id: string): Promise<AdminOrder | null> {
  return listAdminOrders({ limit: 100 }).then((r) => r.items.find((o) => o.id === id) ?? null);
}
