import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PetForm, type PetFormValues } from '@/features/pets/PetForm';
import {
  useDeletePetMutation,
  usePetsQuery,
  useUpdatePetMutation,
} from '@/features/pets/hooks';

export default function EditarPetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pets = usePetsQuery();
  const update = useUpdatePetMutation();
  const remove = useDeletePetMutation();

  const pet = pets.data?.items.find((p) => p.id === id);

  if (pets.isPending) return <ScreenContainer><Text>Carregando…</Text></ScreenContainer>;
  if (!pet) return <ScreenContainer><Text>Pet não encontrado.</Text></ScreenContainer>;

  const onSubmit = async (values: PetFormValues) => {
    try {
      await update.mutateAsync({
        id: pet.id,
        patch: {
          name: values.name,
          species: values.species,
          breed: values.breed?.trim() || undefined,
          birthDate: values.birthDate?.trim() || undefined,
        },
      });
      Alert.alert('Salvo', 'Pet atualizado.');
    } catch (err) {
      Alert.alert('Erro', (err as Error).message);
    }
  };

  const onDelete = () => {
    Alert.alert('Excluir pet', `Confirmar remoção de ${pet.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await remove.mutateAsync(pet.id);
          router.replace('/pets');
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <PetForm
        initialValues={{
          name: pet.name,
          species: pet.species,
          breed: pet.breed ?? '',
          birthDate: pet.birthDate ? pet.birthDate.slice(0, 10) : '',
        }}
        submitLabel="Salvar alterações"
        onSubmit={onSubmit}
        onDelete={onDelete}
      />
    </ScreenContainer>
  );
}
