import { http } from '@/lib/http';
import type { CheckoutBody, Order, OrderListResponse } from './types';

export function checkout(body: CheckoutBody): Promise<Order> {
  return http<Order>('/orders', { method: 'POST', body });
}

export function listMyOrders(page = 1, limit = 10): Promise<OrderListResponse> {
  return http<OrderListResponse>(`/orders?page=${page}&limit=${limit}`, { method: 'GET' });
}

export function getOrder(id: string): Promise<Order> {
  return http<Order>(`/orders/${encodeURIComponent(id)}`, { method: 'GET' });
}
