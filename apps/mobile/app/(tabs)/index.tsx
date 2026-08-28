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
import { usePokemonList, usePokemonSearchIndex } from '@/api/hooks';
import { usePalette } from '@/theme/ThemeProvider';
import { idFromUrl } from '@/lib/pokemon';

export default function PokedexScreen() {
  const palette = usePalette();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const searchTerm = search.trim().toLowerCase();
  const hasSearchTerm = searchTerm.length > 0;
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePokemonList();
  const {
    data: searchIndex,
    isLoading: isSearchLoading,
    isError: isSearchError,
    refetch: refetchSearch,
  } = usePokemonSearchIndex(hasSearchTerm);

  const items = useMemo(() => {
    const loaded =
      data?.pages.flatMap((page) =>
        page.results.map((r) => ({ id: idFromUrl(r.url), name: r.name })),
      ) ?? [];
    if (!hasSearchTerm) return loaded;

    return (searchIndex ?? [])
      .filter(
        (pokemon) =>
          pokemon.name.includes(searchTerm) ||
          String(idFromUrl(pokemon.url)) === searchTerm,
      )
      .map((pokemon) => ({ id: idFromUrl(pokemon.url), name: pokemon.name }));
  }, [data, hasSearchTerm, searchIndex, searchTerm]);

  const showListLoading = !hasSearchTerm && isLoading;
  const showListError = !hasSearchTerm && isError;
  const showSearchLoading = hasSearchTerm && isSearchLoading;
  const showSearchError = hasSearchTerm && isSearchError;

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

      {showListLoading || showSearchLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} size="large" />
        </View>
      ) : showListError || showSearchError ? (
        <View style={styles.center}>
          <Text style={{ color: palette.textMuted }}>
            {t('errors.loadFailed', { defaultValue: 'Could not load Pokémon.' })}
          </Text>
          <Text
            onPress={() => {
              if (showSearchError) {
                void refetchSearch();
              } else {
                void refetch();
              }
            }}
            style={[styles.retry, { color: palette.primary }]}
          >
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
            if (hasNextPage && !isFetchingNextPage && !hasSearchTerm) void fetchNextPage();
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
