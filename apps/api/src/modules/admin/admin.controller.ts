import type { FastifyReply, FastifyRequest } from 'fastify';
import type { MetricsService } from './metrics.service';
import type { AdminService } from './admin.service';
import type {
  AdminOrderListQuery,
  OrderStatusTransitionBody,
} from './admin.schemas';

export class AdminController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly adminService: AdminService,
  ) {}

  getMetrics = async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = await this.metricsService.build();
    return reply.status(200).send(data);
  };

  listOrders = async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as AdminOrderListQuery;
    const data = await this.adminService.listOrders(q);
    return reply.status(200).send(data);
  };

  transitionOrderStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as OrderStatusTransitionBody;
    const data = await this.adminService.transitionOrderStatus(id, status);
    return reply.status(200).send(data);
  };

  listCustomers = async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as { page: number; limit: number; search?: string };
    const data = await this.adminService.listCustomers(q);
    return reply.status(200).send(data);
  };

  listInventory = async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as { page: number; limit: number; lowStock?: boolean };
    const data = await this.adminService.listInventory(q);
    return reply.status(200).send(data);
  };

  updateInventory = async (request: FastifyRequest, reply: FastifyReply) => {
    const { productId } = request.params as { productId: string };
    const patch = request.body as { quantity?: number; reorderPoint?: number };
    const data = await this.adminService.updateInventory(productId, patch);
    return reply.status(200).send(data);
  };
}
