import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { usePalette } from '@/theme/ThemeProvider';

/** Bottom-tab shell. Emoji glyphs keep the icon set dependency-free for now. */
function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const palette = usePalette();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textFaint,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.pokedex', { defaultValue: 'Pokédex' }),
          tabBarIcon: ({ color }) => <TabIcon glyph="▦" color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('nav.favorites', { defaultValue: 'Favorites' }),
          tabBarIcon: ({ color }) => <TabIcon glyph="♥" color={color} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: t('nav.team', { defaultValue: 'Team' }),
          tabBarIcon: ({ color }) => <TabIcon glyph="⛨" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('nav.account', { defaultValue: 'Account' }),
          tabBarIcon: ({ color }) => <TabIcon glyph="☰" color={color} />,
        }}
      />
    </Tabs>
  );
}
