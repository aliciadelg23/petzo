'use client';

// CLIENT — hooks do TanStack Query.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as authApi from './api';
import { useAuthStore } from './store';
import type { LoginFormValues, RegisterFormValues } from './schemas';

export function useLoginMutation() {
  const setSession = useAuthStore((s) => s.setSession);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (values: LoginFormValues) => authApi.login(values),
    onSuccess: (data) => {
      setSession({ user: data.user, accessToken: data.accessToken });
      qc.invalidateQueries();
    },
  });
}

export function useRegisterMutation() {
  const setSession = useAuthStore((s) => s.setSession);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (values: RegisterFormValues) => authApi.register(values),
    onSuccess: (data) => {
      setSession({ user: data.user, accessToken: data.accessToken });
      qc.invalidateQueries();
    },
  });
}

export function useLogoutMutation() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearSession();
      qc.clear();
    },
  });
}
