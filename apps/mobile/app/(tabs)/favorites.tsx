import { FlatList, Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePrimeDexStore } from '@primedex/core';
import { Screen } from '@/components/Screen';
import { PokemonCard } from '@/components/PokemonCard';
import { usePalette } from '@/theme/ThemeProvider';

export default function FavoritesScreen() {
  const palette = usePalette();
  const { t } = useTranslation();
  const favorites = usePrimeDexStore((s) => s.favorites);

  if (favorites.length === 0) {
    return (
      <Screen edges={{ top: false }}>
        <View style={styles.center}>
          <Text style={styles.emoji}>♡</Text>
          <Text style={[styles.emptyTitle, { color: palette.text }]}>
            {t('favorites.emptyTitle', { defaultValue: 'No favorites yet' })}
          </Text>
          <Text style={[styles.emptyBody, { color: palette.textMuted }]}>
            {t('favorites.emptyBody', {
              defaultValue: 'Tap the heart on any Pokémon to save it here.',
            })}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={{ top: false }}>
      <FlatList
        data={favorites}
        keyExtractor={(id) => String(id)}
        numColumns={2}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <PokemonCard id={item} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 6, paddingVertical: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emoji: { fontSize: 48, color: '#e11d48' },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyBody: { fontSize: 15, textAlign: 'center' },
});
