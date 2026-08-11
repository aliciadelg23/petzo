import { http } from '@/lib/http';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  productId: string;
  slug: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  addressSnapshot: Record<string, string | null | undefined>;
  couponCode: string | null;
  items: OrderItem[];
  payment: { provider: string; status: string; paidAt: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutBody {
  address: {
    label: string;
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    zip: string;
  };
  couponCode?: string;
}

export const checkout = (body: CheckoutBody) =>
  http<Order>('/orders', { method: 'POST', body });

export const listOrders = (page = 1, limit = 20) =>
  http<{ items: Order[]; total: number; page: number; totalPages: number }>(
    `/orders?page=${page}&limit=${limit}`,
  );

export const getOrder = (id: string) => http<Order>(`/orders/${encodeURIComponent(id)}`);
