export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentProvider = 'STRIPE' | 'PIX' | 'BOLETO' | 'MANUAL';

export interface AddressSnapshot {
  label: string;
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  slug: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderPayment {
  id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  paidAt: string | null;
}

export interface Order {
  id: string;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  addressSnapshot: AddressSnapshot;
  couponCode: string | null;
  items: OrderItem[];
  payment: OrderPayment | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  items: Order[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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
    country?: string;
  };
  couponCode?: string;
}
