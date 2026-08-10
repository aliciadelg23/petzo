/**
 * Erro emitido pelo cliente HTTP quando a API responde com status != 2xx
 * ou quando o payload de erro é malformado.
 */
export class HttpError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(params: { status: number; message: string; code?: string; details?: unknown }) {
    super(params.message);
    this.name = 'HttpError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }

  static isHttpError(err: unknown): err is HttpError {
    return err instanceof HttpError;
  }
}

/** Erro de rede (fetch rejeitou antes de receber resposta). */
export class NetworkError extends Error {
  constructor(message = 'Falha de rede ao consultar a API.') {
    super(message);
    this.name = 'NetworkError';
  }
}
