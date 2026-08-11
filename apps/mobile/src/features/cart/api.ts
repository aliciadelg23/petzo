import { http } from '@/lib/http';

export interface CartItem {
  id: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  availableStock: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  updatedAt: string;
}

export const getCart = () => http<Cart>('/cart');
export const addItem = (input: { productId: string; quantity: number }) =>
  http<Cart>('/cart/items', { method: 'POST', body: input });
export const updateItem = (itemId: string, quantity: number) =>
  http<Cart>(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } });
export const removeItem = (itemId: string) =>
  http<Cart>(`/cart/items/${itemId}`, { method: 'DELETE' });
export const clearCart = () => http<Cart>('/cart', { method: 'DELETE' });
