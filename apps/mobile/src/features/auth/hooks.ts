import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { useAuthStore } from './store';

export function useLoginMutation() {
  const setSession = useAuthStore((s) => s.setSession);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.login,
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
    mutationFn: api.register,
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
    mutationFn: api.logout,
    onSettled: () => {
      clearSession();
      qc.clear();
    },
  });
}
