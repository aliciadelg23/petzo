/**
 * Converte centavos (Int) em BRL. Mesma semântica do web.
 * Portfólio-note: quando extrairmos packages/shared, esta função vem de lá.
 */
export function formatBRL(cents: number): string {
  const value = Math.max(0, cents) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}
