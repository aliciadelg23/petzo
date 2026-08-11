import { expect, SEED_USER, test } from './fixtures';

test.describe('auth flow', () => {
  test('login com credenciais válidas leva para /conta', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel(/email/i).fill(SEED_USER.customer.email);
    await page.getByLabel(/senha/i).fill(SEED_USER.customer.password);
    await page.getByRole('button', { name: /entrar/i }).click();

    await page.waitForURL(/\/conta$/);
    await expect(page.getByRole('heading', { name: /minha conta/i })).toBeVisible();
    await expect(page.getByText(SEED_USER.customer.email)).toBeVisible();
  });

  test('login com senha errada mostra erro amigável', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel(/email/i).fill(SEED_USER.customer.email);
    await page.getByLabel(/senha/i).fill('Errada!123');
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page.getByText(/email ou senha incorretos/i)).toBeVisible();
    await expect(page).toHaveURL(/\/entrar/);
  });

  test('acesso a /conta sem login redireciona para /entrar', async ({ page, context }) => {
    // Garante sessão limpa
    await context.clearCookies();
    await page.goto('/conta');
    await page.waitForURL(/\/entrar/);
    await expect(page).toHaveURL(/redirect=/);
  });
});
