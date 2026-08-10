import type { FastifyReply, FastifyRequest } from 'fastify';
import type { OrderService } from './order.service';
import type { CheckoutBody, ListOrdersQuery } from './order.schemas';
import { UnauthorizedError } from '@/shared/errors';

export class OrderController {
  constructor(private readonly service: OrderService) {}

  private requireUser(request: FastifyRequest): string {
    const id = request.currentUser?.sub;
    if (!id) throw new UnauthorizedError('Autenticação necessária.');
    return id;
  }

  checkout = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUser(request);
    const order = await this.service.checkout(userId, request.body as CheckoutBody);
    return reply.status(201).send(order);
  };

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUser(request);
    const { page, limit } = request.query as ListOrdersQuery;
    const result = await this.service.listMyOrders(userId, page, limit);
    return reply.status(200).send(result);
  };

  findOne = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUser(request);
    const { id } = request.params as { id: string };
    const order = await this.service.getMyOrder(userId, id);
    return reply.status(200).send(order);
  };
}
