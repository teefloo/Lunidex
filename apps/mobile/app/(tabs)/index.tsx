import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { PokemonCard } from '@/components/PokemonCard';
import { usePokemonList } from '@/api/hooks';
import { usePalette } from '@/theme/ThemeProvider';
import { idFromUrl } from '@/lib/pokemon';

export default function PokedexScreen() {
  const palette = usePalette();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePokemonList();

  const items = useMemo(() => {
    const all =
      data?.pages.flatMap((page) =>
        page.results.map((r) => ({ id: idFromUrl(r.url), name: r.name })),
      ) ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (p) => p.name.includes(term) || String(p.id) === term,
    );
  }, [data, search]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>
          {t('nav.pokedex', { defaultValue: 'Pokédex' })}
        </Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('search.placeholder', { defaultValue: 'Search a Pokémon…' })}
          placeholderTextColor={palette.textFaint}
          autoCorrect={false}
          autoCapitalize="none"
          style={[
            styles.search,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              color: palette.text,
            },
          ]}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ color: palette.textMuted }}>
            {t('errors.loadFailed', { defaultValue: 'Could not load Pokémon.' })}
          </Text>
          <Text onPress={() => refetch()} style={[styles.retry, { color: palette.primary }]}>
            {t('actions.retry', { defaultValue: 'Retry' })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <PokemonCard id={item.id} />}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage && !search) fetchNextPage();
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: palette.textMuted }]}>
              {t('search.noResults', { defaultValue: 'No Pokémon found.' })}
            </Text>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={palette.primary} style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 10 },
  search: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  list: { paddingHorizontal: 6, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  retry: { fontSize: 16, fontWeight: '700', padding: 8 },
  empty: { textAlign: 'center', marginTop: 40 },
});
