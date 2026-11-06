import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../theme';

const icon = (glyph: string) => ({ color }: { color: import("react-native").ColorValue }) => (
  <Text style={{ color, fontSize: 20 }}>{glyph}</Text>
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', headerShown: false, tabBarIcon: icon('◉') }} />
      <Tabs.Screen name="historique" options={{ title: 'Historique', tabBarIcon: icon('▤') }} />
      <Tabs.Screen name="appareil" options={{ title: 'Capteur', tabBarIcon: icon('⌁') }} />
    </Tabs>
  );
}
