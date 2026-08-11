'use client';

// CLIENT — hook do React Query só faz sentido no browser.

import { useQuery } from '@tanstack/react-query';
import { getHealth, type HealthResponse } from './api';

export const healthKeys = {
  root: ['health'] as const,
};

export function useHealthQuery() {
  return useQuery<HealthResponse>({
    queryKey: healthKeys.root,
    queryFn: getHealth,
    // health é volátil; sem stale time
    staleTime: 0,
    // 1 retry só; NetworkError enquanto API não sobe é esperado
    retry: 1,
  });
}
