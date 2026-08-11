'use client';

import { useEffect, useState } from 'react';

/**
 * Retorna `value` estabilizado por `delay` ms.
 *
 * Uso típico: input de busca — a cada keystroke o input local muda imediato
 * (controlled), mas o valor "debounced" só atualiza quando o usuário para de
 * digitar. Downstream (URL push, network call) reage ao debounced.
 *
 *   const [text, setText] = useState('')
 *   const query = useDebouncedValue(text, 300)
 *
 * Escolhas defensáveis:
 * - Sem `useMemo`/`useCallback` internos — não temos filhos memoizados nem
 *   deps derivadas fora do próprio efeito.
 * - `clearTimeout` no cleanup evita race quando `value` muda mais rápido que
 *   `delay` (aborta o agendamento anterior).
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}
