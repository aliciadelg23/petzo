import { http } from '@/lib/http';

export interface WishlistItem {
  id: string;
  productId: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string | null;
  createdAt: string;
}
export interface Wishlist {
  id: string;
  items: WishlistItem[];
}

export const getWishlist = () => http<Wishlist>('/wishlist');
export const addToWishlist = (productId: string) =>
  http<Wishlist>('/wishlist/items', { method: 'POST', body: { productId } });
export const removeFromWishlist = (productId: string) =>
  http<Wishlist>(`/wishlist/items/${encodeURIComponent(productId)}`, { method: 'DELETE' });
