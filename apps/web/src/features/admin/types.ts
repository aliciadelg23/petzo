export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface DashboardMetrics {
  sales: {
    total: number;
    count: number;
    avgTicket: number;
    series: { date: string; revenue: number; orders: number }[];
  };
  orders: {
    total: number;
    byStatus: Record<OrderStatus, number>;
    pending: number;
  };
  customers: {
    total: number;
    newLast30d: number;
  };
  products: {
    total: number;
    active: number;
    lowStock: {
      id: string;
      slug: string;
      name: string;
      quantity: number;
      reorderPoint: number;
    }[];
  };
}

export interface AdminOrder {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  itemCount: number;
  customer: { id: string; name: string; email: string };
}

export interface AdminOrderListResponse {
  items: AdminOrder[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminCustomer {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  emailVerifiedAt: string | null;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
}

export interface AdminCustomerListResponse {
  items: AdminCustomer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminInventoryItem {
  productId: string;
  slug: string;
  name: string;
  active: boolean;
  quantity: number;
  reserved: number;
  reorderPoint: number;
  price: number;
}

export interface AdminInventoryListResponse {
  items: AdminInventoryItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
