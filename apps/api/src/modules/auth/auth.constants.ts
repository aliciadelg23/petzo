/**
 * Constantes do módulo de auth.
 * TTL / nomes NÃO são secrets — vivem aqui, no código. Secrets são env vars.
 */

/** Access token (JWT) — vida curta, viaja no header Authorization. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 min

/** Refresh token — vida longa, viaja em cookie httpOnly + rotaciona a cada uso. */
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 dias

/**
 * Nome do cookie do refresh token. Prefixo Petzo evita colisão com outros apps
 * no mesmo host durante dev.
 */
export const REFRESH_COOKIE_NAME = 'petzo_refresh';

/**
 * Path do cookie: apenas rotas de auth precisam do refresh token → reduz superfície
 * de exposição do cookie a qualquer request.
 */
export const REFRESH_COOKIE_PATH = '/auth';

export const REFRESH_TOKEN_BYTES = 32;
