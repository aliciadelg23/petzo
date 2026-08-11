import { test as base, expect, type Page } from '@playwright/test';

/**
 * Credenciais dos users do seed. Se o schema/seed mudar, atualizar aqui.
 * Password é o mesmo para todos os dev users.
 */
export const SEED_USER = {
  customer: {
    email: 'alice.dev@petzo.test',
    password: 'Password!1',
    name: 'Alice',
  },
} as const;

/**
 * Helper: faz login pela UI e retorna com a página em /conta.
 * (Preferimos UI-login em testes E2E porque é o mesmo caminho do usuário real.)
 */
export async function loginViaUI(page: Page, redirect: string = '/conta'): Promise<void> {
  await page.goto(`/entrar?redirect=${encodeURIComponent(redirect)}`);
  await page.getByLabel(/email/i).fill(SEED_USER.customer.email);
  await page.getByLabel(/senha/i).fill(SEED_USER.customer.password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(new RegExp(redirect.replace(/\//g, '\\/')));
}

export const test = base;
export { expect };
