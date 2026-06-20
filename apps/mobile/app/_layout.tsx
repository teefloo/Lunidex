import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { AppProviders } from '@/providers/AppProviders';
import { usePalette } from '@/theme/ThemeProvider';

function RootStack() {
  const palette = usePalette();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="pokemon/[name]" options={{ title: '', headerTransparent: true }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <RootStack />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
