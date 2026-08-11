import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export const petKeys = { list: ['pets'] as const };

export function usePetsQuery() {
  return useQuery({ queryKey: petKeys.list, queryFn: api.listPets });
}
export function useCreatePetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createPet,
    onSuccess: () => qc.invalidateQueries({ queryKey: petKeys.list }),
  });
}
export function useUpdatePetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<api.UpsertPetInput> }) =>
      api.updatePet(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: petKeys.list }),
  });
}
export function useDeletePetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deletePet,
    onSuccess: () => qc.invalidateQueries({ queryKey: petKeys.list }),
  });
}
