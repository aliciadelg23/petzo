import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PetForm, type PetFormValues } from '@/features/pets/PetForm';
import { useCreatePetMutation } from '@/features/pets/hooks';

export default function NovoPetScreen() {
  const router = useRouter();
  const create = useCreatePetMutation();

  const onSubmit = async (values: PetFormValues) => {
    try {
      await create.mutateAsync({
        name: values.name,
        species: values.species,
        breed: values.breed?.trim() || undefined,
        birthDate: values.birthDate?.trim() || undefined,
      });
      router.replace('/pets');
    } catch (err) {
      Alert.alert('Erro', (err as Error).message || 'Falha ao criar pet.');
    }
  };

  return (
    <ScreenContainer>
      <PetForm submitLabel="Criar pet" onSubmit={onSubmit} />
    </ScreenContainer>
  );
}
