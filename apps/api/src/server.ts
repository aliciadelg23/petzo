import { buildApp } from './app';
import { env } from '@/config/env';

/**
 * Entry-point de runtime.
 * Constrói a app e escuta em HOST:PORT.
 * Encerramento gracioso via SIGINT/SIGTERM.
 */
async function main() {
  const app = await buildApp();

  const closeGracefully = async (signal: NodeJS.Signals) => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    process.exit(0);
  };

  process.once('SIGINT', () => void closeGracefully('SIGINT'));
  process.once('SIGTERM', () => void closeGracefully('SIGTERM'));

  try {
    await app.listen({ host: env.API_HOST, port: env.API_PORT });
  } catch (err) {
    app.log.fatal({ err }, 'failed to start');
    process.exit(1);
  }
}

void main();
