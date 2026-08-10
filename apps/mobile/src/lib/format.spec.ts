import { buildQueryString, formatBRL } from './format';

describe('formatBRL', () => {
  it('formata centavos em BRL', () => {
    expect(formatBRL(0)).toContain('0,00');
    expect(formatBRL(1500)).toContain('15,00');
    expect(formatBRL(18990)).toContain('189,90');
  });
  it('valores negativos → 0,00', () => {
    expect(formatBRL(-100)).toContain('0,00');
  });
});

describe('buildQueryString', () => {
  it('vazio → ""', () => {
    expect(buildQueryString({})).toBe('');
  });
  it('omite undefined e strings vazias', () => {
    expect(buildQueryString({ search: undefined, page: 1, empty: '' })).toBe('?page=1');
  });
  it('serializa múltiplos', () => {
    const qs = buildQueryString({ search: 'racao', page: 2 });
    expect(qs).toContain('search=racao');
    expect(qs).toContain('page=2');
  });
});
