import { http } from '@/lib/http';
import type { Species } from '@/features/catalog/api';

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string | null;
  birthDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPetInput {
  name: string;
  species: Species;
  breed?: string;
  birthDate?: string;
}

export const listPets = () => http<{ items: Pet[] }>('/pets');
export const createPet = (input: UpsertPetInput) =>
  http<Pet>('/pets', { method: 'POST', body: input });
export const updatePet = (id: string, patch: Partial<UpsertPetInput>) =>
  http<Pet>(`/pets/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
export const deletePet = (id: string) =>
  http<void>(`/pets/${encodeURIComponent(id)}`, { method: 'DELETE' });
