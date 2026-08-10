import { http } from '@/lib/http';
import type { Cart } from './types';

export function getMyCart(): Promise<Cart> {
  return http<Cart>('/cart', { method: 'GET' });
}

export function addToCart(input: { productId: string; quantity: number }): Promise<Cart> {
  return http<Cart>('/cart/items', { method: 'POST', body: input });
}

export function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  return http<Cart>(`/cart/items/${itemId}`, {
    method: 'PATCH',
    body: { quantity },
  });
}

export function removeCartItem(itemId: string): Promise<Cart> {
  return http<Cart>(`/cart/items/${itemId}`, { method: 'DELETE' });
}

export function clearCart(): Promise<Cart> {
  return http<Cart>('/cart', { method: 'DELETE' });
}
