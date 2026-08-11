import type { Prisma, PrismaClient } from '@prisma/client';

const CART_INCLUDE = {
  items: {
    orderBy: { createdAt: 'asc' } as const,
    include: {
      product: {
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          inventory: true,
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{ include: typeof CART_INCLUDE }>;
export type CartItemFull = CartWithItems['items'][number];

export class CartRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findOrCreateByUser(userId: string): Promise<CartWithItems> {
    const existing = await this.prisma.cart.findUnique({
      where: { userId },
      include: CART_INCLUDE,
    });
    if (existing) return existing;
    return this.prisma.cart.create({
      data: { userId },
      include: CART_INCLUDE,
    });
  }

  findItemById(id: string) {
    return this.prisma.cartItem.findUnique({
      where: { id },
      include: {
        cart: true,
        product: { include: { inventory: true } },
      },
    });
  }

  findItemInCart(cartId: string, productId: string) {
    return this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } },
    });
  }

  createItem(input: { cartId: string; productId: string; quantity: number }) {
    return this.prisma.cartItem.create({ data: input });
  }

  updateItemQuantity(id: string, quantity: number) {
    return this.prisma.cartItem.update({ where: { id }, data: { quantity } });
  }

  deleteItem(id: string) {
    return this.prisma.cartItem.delete({ where: { id } });
  }

  clearCart(cartId: string) {
    return this.prisma.cartItem.deleteMany({ where: { cartId } });
  }

  findProductWithInventory(productId: string) {
    return this.prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true },
    });
  }
}
