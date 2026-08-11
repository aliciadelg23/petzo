import { expect, loginViaUI, test } from './fixtures';

/**
 * Fluxo end-to-end de compra:
 *   login → catálogo → produto → adicionar ao carrinho → checkout → pedido.
 *
 * Serializa em uma spec só para garantir ordem determinística e reuso da
 * mesma page/sessão.
 */
test.describe('compra end-to-end', () => {
  test('login → catálogo → produto → carrinho → checkout → pedido confirmado', async ({ page }) => {
    // 1. Login
    await loginViaUI(page, '/products');

    // 2. Catálogo — lista visível
    await expect(page.getByRole('heading', { name: /produtos/i })).toBeVisible();
    // Aguarda pelo menos uma card de produto
    const firstCard = page.locator('a[href^="/products/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });

    // 3. Produto — abre o primeiro
    await firstCard.click();
    await page.waitForURL(/\/products\/[^/]+/);
    const addBtn = page.getByRole('button', { name: /adicionar ao carrinho/i });
    await expect(addBtn).toBeVisible();

    // 4. Adiciona ao carrinho
    await addBtn.click();
    // Feedback: mensagem OU já reflete no ícone
    // (a UI pode mostrar success sem alert; navegamos ao carrinho para confirmar)

    // 5. Vai para o carrinho
    await page.goto('/carrinho');
    await expect(page.getByRole('heading', { name: /meu carrinho/i })).toBeVisible();
    // Existe ao menos um botão "Ir para checkout"
    const checkoutBtn = page.getByRole('link', { name: /ir para checkout/i });
    await expect(checkoutBtn).toBeVisible();

    // 6. Checkout — preenche endereço
    await checkoutBtn.click();
    await page.waitForURL(/\/checkout/);
    await expect(page.getByRole('heading', { name: /^checkout$/i })).toBeVisible();

    // O rótulo tem valor default "Casa", só precisamos preencher o resto
    await page.getByRole('textbox', { name: /^cep$/i }).fill('01234-567');
    await page.getByRole('textbox', { name: /^rua$/i }).fill('Rua E2E');
    await page.getByRole('textbox', { name: /^número$/i }).fill('42');
    await page.getByRole('textbox', { name: /^bairro$/i }).fill('Bairro Teste');
    await page.getByRole('textbox', { name: /^cidade$/i }).fill('Cidade Teste');
    await page.getByRole('textbox', { name: /^uf$/i }).fill('SP');

    // 7. Finalizar
    await page.getByRole('button', { name: /finalizar compra/i }).click();

    // 8. Pedido confirmado
    await page.waitForURL(/\/checkout\/sucesso\//, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /pedido confirmado/i })).toBeVisible();
    await expect(page.getByText(/pago|entrega|itens/i)).toBeVisible();

    // 9. Ver na lista de pedidos
    await page.getByRole('link', { name: /meus pedidos/i }).click();
    await page.waitForURL(/\/conta\/pedidos/);
    await expect(page.getByRole('heading', { name: /meus pedidos/i })).toBeVisible();
  });
});
