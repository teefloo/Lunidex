import { FlatList, Pressable, Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePrimeDexStore } from '@primedex/core';
import { Screen } from '@/components/Screen';
import { PokemonCard } from '@/components/PokemonCard';
import { usePalette } from '@/theme/ThemeProvider';

const MAX_TEAM = 6;

export default function TeamScreen() {
  const palette = usePalette();
  const { t } = useTranslation();
  const team = usePrimeDexStore((s) => s.team);
  const clearTeam = usePrimeDexStore((s) => s.clearTeam);

  return (
    <Screen edges={{ top: false }}>
      <View style={styles.header}>
        <Text style={[styles.count, { color: palette.text }]}>
          {t('team.count', {
            defaultValue: '{{n}}/{{max}} on your team',
            n: team.length,
            max: MAX_TEAM,
          })}
        </Text>
        {team.length > 0 ? (
          <Pressable onPress={clearTeam} hitSlop={8}>
            <Text style={[styles.clear, { color: palette.danger }]}>
              {t('team.clear', { defaultValue: 'Clear' })}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {team.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emoji}>⛨</Text>
          <Text style={[styles.emptyTitle, { color: palette.text }]}>
            {t('team.emptyTitle', { defaultValue: 'Build your team' })}
          </Text>
          <Text style={[styles.emptyBody, { color: palette.textMuted }]}>
            {t('team.emptyBody', {
              defaultValue: 'Add up to six Pokémon from any detail page.',
            })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={team}
          keyExtractor={(id) => String(id)}
          numColumns={2}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <PokemonCard id={item} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  count: { fontSize: 16, fontWeight: '700' },
  clear: { fontSize: 15, fontWeight: '700' },
  list: { paddingHorizontal: 6, paddingVertical: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emoji: { fontSize: 48, color: '#7c83ff' },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyBody: { fontSize: 15, textAlign: 'center' },
});
