/**
 * Hierarquia de erros da API. Todo erro que sobe até o error-handler global
 * DEVE ser (ou derivar de) `AppError` para retorno consistente `{code,message,...}`.
 * Erros nativos/não previstos viram 500 INTERNAL_ERROR.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(params: {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
  }) {
    super(params.message);
    this.name = 'AppError';
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.details = params.details;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dados inválidos.', details?: unknown) {
    super({ statusCode: 400, code: 'VALIDATION_ERROR', message, details });
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado.') {
    super({ statusCode: 401, code: 'UNAUTHORIZED', message });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Ação não permitida.') {
    super({ statusCode: 403, code: 'FORBIDDEN', message });
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado.') {
    super({ statusCode: 404, code: 'NOT_FOUND', message });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflito de estado.') {
    super({ statusCode: 409, code: 'CONFLICT', message });
    this.name = 'ConflictError';
  }
}
