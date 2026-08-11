import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ProductService } from './product.service';
import type {
  CreateProductBody,
  ListQuery,
  ProductIdParam,
  UpdateProductBody,
} from './product.schemas';

/**
 * O controller decide `includeInactive` a partir da role no JWT.
 * As request generics vêm dos schemas Zod anexados no arquivo de routes;
 * evitamos declará-las aqui para não brigar com o inferidor do type provider.
 */
export class ProductController {
  constructor(private readonly service: ProductService) {}

  private canSeeInactive(request: FastifyRequest): boolean {
    const role = request.currentUser?.role;
    return role === 'ADMIN' || role === 'STAFF';
  }

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const includeInactive = this.canSeeInactive(request);
    const result = await this.service.list(request.query as ListQuery, { includeInactive });
    return reply.status(200).send(result);
  };

  findOne = async (request: FastifyRequest, reply: FastifyReply) => {
    const includeInactive = this.canSeeInactive(request);
    const { id } = request.params as ProductIdParam;
    const product = await this.service.findOne(id, { includeInactive });
    return reply.status(200).send(product);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const product = await this.service.create(request.body as CreateProductBody);
    return reply.status(201).send(product);
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as ProductIdParam;
    const product = await this.service.update(id, request.body as UpdateProductBody);
    return reply.status(200).send(product);
  };

  softDelete = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as ProductIdParam;
    await this.service.softDelete(id);
    return reply.status(204).send();
  };
}
