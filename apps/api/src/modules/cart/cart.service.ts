import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import type { CartItemFull, CartRepository, CartWithItems } from './cart.repository';
import type { CartResponse } from './cart.schemas';

export class CartService {
  constructor(private readonly repo: CartRepository) {}

  // ---------------------------------------------------------------------------
  // Casos de uso
  // ---------------------------------------------------------------------------

  async getMyCart(userId: string): Promise<CartResponse> {
    const cart = await this.repo.findOrCreateByUser(userId);
    return this.toResponse(cart);
  }

  async addItem(
    userId: string,
    input: { productId: string; quantity: number },
  ): Promise<CartResponse> {
    const cart = await this.repo.findOrCreateByUser(userId);

    const existing = await this.repo.findItemInCart(cart.id, input.productId);
    const newQty = (existing?.quantity ?? 0) + input.quantity;

    await this.assertStock(input.productId, newQty);

    // `upsert` cobre a corrida entre dois cliques rápidos: sem ele, o INSERT
    // do segundo fluxo estoura o unique(cartId,productId) e vira 500.
    await this.repo.upsertItem({
      cartId: cart.id,
      productId: input.productId,
      quantity: newQty,
    });

    return this.getMyCart(userId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    quantity: number,
  ): Promise<CartResponse> {
    const item = await this.repo.findItemById(itemId);
    if (!item) throw new NotFoundError('Item de carrinho não encontrado.');
    if (item.cart.userId !== userId) {
      throw new NotFoundError('Item de carrinho não encontrado.');
    }
    await this.assertStock(item.productId, quantity);
    await this.repo.updateItemQuantity(item.id, quantity);
    return this.getMyCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<CartResponse> {
    const item = await this.repo.findItemById(itemId);
    if (!item) throw new NotFoundError('Item de carrinho não encontrado.');
    if (item.cart.userId !== userId) {
      throw new NotFoundError('Item de carrinho não encontrado.');
    }
    await this.repo.deleteItem(item.id);
    return this.getMyCart(userId);
  }

  async clearCart(userId: string): Promise<CartResponse> {
    const cart = await this.repo.findOrCreateByUser(userId);
    await this.repo.clearCart(cart.id);
    return this.getMyCart(userId);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async assertStock(productId: string, desiredQty: number): Promise<void> {
    const product = await this.repo.findProductWithInventory(productId);
    if (!product) throw new ValidationError('Produto não existe.', { field: 'productId' });
    if (!product.active) throw new ConflictError('Produto está indisponível.');
    const stock = product.inventory?.quantity ?? 0;
    if (stock < desiredQty) {
      throw new ConflictError(
        `Estoque insuficiente. Disponível: ${stock}, solicitado: ${desiredQty}.`,
      );
    }
  }

  private toResponse(cart: CartWithItems): CartResponse {
    let subtotal = 0;
    let itemCount = 0;
    const items = cart.items.map((it) => {
      const unitPrice = it.product.price;
      const lineTotal = unitPrice * it.quantity;
      subtotal += lineTotal;
      itemCount += it.quantity;
      return this.itemToResponse(it, unitPrice, lineTotal);
    });
    return {
      id: cart.id,
      userId: cart.userId,
      items,
      subtotal,
      itemCount,
      updatedAt: cart.updatedAt.toISOString(),
    };
  }

  private itemToResponse(it: CartItemFull, unitPrice: number, lineTotal: number) {
    const image = it.product.images[0];
    return {
      id: it.id,
      productId: it.productId,
      slug: it.product.slug,
      name: it.product.name,
      imageUrl: image?.url ?? null,
      unitPrice,
      quantity: it.quantity,
      lineTotal,
      availableStock: it.product.inventory?.quantity ?? 0,
    };
  }
}
