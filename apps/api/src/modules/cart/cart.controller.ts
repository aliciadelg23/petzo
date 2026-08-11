import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CartService } from './cart.service';
import { UnauthorizedError } from '@/shared/errors';

export class CartController {
  constructor(private readonly service: CartService) {}

  private requireUser(request: FastifyRequest): string {
    const id = request.currentUser?.sub;
    if (!id) throw new UnauthorizedError('Autenticação necessária.');
    return id;
  }

  getMyCart = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUser(request);
    const cart = await this.service.getMyCart(userId);
    return reply.status(200).send(cart);
  };

  addItem = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUser(request);
    const cart = await this.service.addItem(
      userId,
      request.body as { productId: string; quantity: number },
    );
    return reply.status(201).send(cart);
  };

  updateItem = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUser(request);
    const { itemId } = request.params as { itemId: string };
    const { quantity } = request.body as { quantity: number };
    const cart = await this.service.updateItem(userId, itemId, quantity);
    return reply.status(200).send(cart);
  };

  removeItem = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUser(request);
    const { itemId } = request.params as { itemId: string };
    const cart = await this.service.removeItem(userId, itemId);
    return reply.status(200).send(cart);
  };

  clearCart = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUser(request);
    const cart = await this.service.clearCart(userId);
    return reply.status(200).send(cart);
  };
}
