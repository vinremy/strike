import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../state/AppContext';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
          headerBackTitle: 'Retour',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="seance/live" options={{ title: 'Séance en cours', gestureEnabled: false, headerBackVisible: false, headerLeft: () => null }} />
        <Stack.Screen name="seance/[id]" options={{ title: 'Bilan de séance' }} />
      </Stack>
    </AppProvider>
  );
}
