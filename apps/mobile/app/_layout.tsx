import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthHydrator } from '@/providers/AuthHydrator';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthHydrator />
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="produto/[slug]"
              options={{ headerShown: true, title: 'Produto' }}
            />
            <Stack.Screen
              name="categoria/[slug]"
              options={{ headerShown: true, title: 'Categoria' }}
            />
            <Stack.Screen name="busca" options={{ headerShown: true, title: 'Buscar' }} />
            <Stack.Screen name="checkout" options={{ headerShown: true, title: 'Checkout' }} />
            <Stack.Screen
              name="pedidos/index"
              options={{ headerShown: true, title: 'Meus pedidos' }}
            />
            <Stack.Screen
              name="pedidos/[id]"
              options={{ headerShown: true, title: 'Pedido' }}
            />
            <Stack.Screen name="pets/index" options={{ headerShown: true, title: 'Meus pets' }} />
            <Stack.Screen name="pets/novo" options={{ headerShown: true, title: 'Novo pet' }} />
            <Stack.Screen name="pets/[id]" options={{ headerShown: true, title: 'Pet' }} />
            <Stack.Screen
              name="favoritos"
              options={{ headerShown: true, title: 'Favoritos' }}
            />
          </Stack>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
