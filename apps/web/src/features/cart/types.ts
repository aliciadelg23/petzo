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
