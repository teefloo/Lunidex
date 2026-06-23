import { ActivityIndicator, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { usePrimeDexStore } from '@primedex/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePokemonDetail } from '@/api/hooks';
import { usePalette } from '@/theme/ThemeProvider';
import { TypeBadge } from '@/components/TypeBadge';
import { StatBar } from '@/components/StatBar';
import { FavoriteButton } from '@/components/FavoriteButton';
import { artworkUrl, formatDexId, formatName, typeColor } from '@/lib/pokemon';

export default function PokemonDetailScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { name: param } = useLocalSearchParams<{ name: string }>();
  const { data, isLoading, isError } = usePokemonDetail(param);

  const id = data?.id ?? Number(param) || 0;
  const types = data?.types?.map((ty) => ty.type.name) ?? [];
  const heroColor = types[0] ? typeColor(types[0]) : palette.primary;

  const isCaught = usePrimeDexStore((s) => (id ? s.caughtPokemon.includes(id) : false));
  const toggleCaught = usePrimeDexStore((s) => s.toggleCaught);
  const inTeam = usePrimeDexStore((s) => (id ? s.team.includes(id) : false));
  const addToTeam = usePrimeDexStore((s) => s.addToTeam);
  const removeFromTeam = usePrimeDexStore((s) => s.removeFromTeam);
  const teamFull = usePrimeDexStore((s) => s.team.length >= 6);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} size="large" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <Text style={{ color: palette.textMuted }}>
          {t('errors.loadFailed', { defaultValue: 'Could not load this Pokémon.' })}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Stack.Screen options={{ title: formatName(data.name) }} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: heroColor, paddingTop: insets.top + 56 }]}>
          <FavoriteButton id={id} style={styles.heroFav} />
          <Text style={styles.heroDex}>{formatDexId(id)}</Text>
          <Image
            source={{ uri: data.sprites.other['official-artwork'].front_default ?? artworkUrl(id) }}
            style={styles.heroImage}
            contentFit="contain"
            transition={200}
            accessibilityLabel={formatName(data.name)}
          />
        </View>

        <View style={styles.body}>
          <Text style={[styles.name, { color: palette.text }]}>{formatName(data.name)}</Text>
          <View style={styles.types}>
            {types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </View>

          {/* Physical attributes */}
          <View style={styles.attrRow}>
            <Attr
              label={t('detail.height', { defaultValue: 'Height' })}
              value={`${(data.height / 10).toFixed(1)} m`}
              palette={palette}
            />
            <Attr
              label={t('detail.weight', { defaultValue: 'Weight' })}
              value={`${(data.weight / 10).toFixed(1)} kg`}
              palette={palette}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <ActionButton
              label={
                isCaught
                  ? t('detail.caught', { defaultValue: 'Caught' })
                  : t('detail.markCaught', { defaultValue: 'Mark caught' })
              }
              active={isCaught}
              activeColor={palette.success}
              palette={palette}
              onPress={() => toggleCaught(id)}
            />
            <ActionButton
              label={
                inTeam
                  ? t('detail.inTeam', { defaultValue: 'In team' })
                  : t('detail.addTeam', { defaultValue: 'Add to team' })
              }
              active={inTeam}
              activeColor={palette.primary}
              palette={palette}
              disabled={!inTeam && teamFull}
              onPress={() => (inTeam ? removeFromTeam(id) : addToTeam(id))}
            />
          </View>

          {/* Stats */}
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t('detail.baseStats', { defaultValue: 'Base stats' })}
          </Text>
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {data.stats.map((s) => (
              <StatBar key={s.stat.name} name={s.stat.name} value={s.base_stat} />
            ))}
          </View>

          {/* Abilities */}
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t('detail.abilities', { defaultValue: 'Abilities' })}
          </Text>
          <View style={styles.abilities}>
            {data.abilities.map((a) => (
              <View
                key={a.ability.name}
                style={[styles.ability, { backgroundColor: palette.surface, borderColor: palette.border }]}
              >
                <Text style={[styles.abilityText, { color: palette.text }]}>
                  {formatName(a.ability.name)}
                </Text>
                {a.is_hidden ? (
                  <Text style={[styles.hidden, { color: palette.textFaint }]}>
                    {t('detail.hidden', { defaultValue: 'hidden' })}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Attr({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof usePalette>;
}) {
  return (
    <View style={[styles.attr, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.attrLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.attrValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

function ActionButton({
  label,
  active,
  activeColor,
  palette,
  onPress,
  disabled,
}: {
  label: string;
  active: boolean;
  activeColor: string;
  palette: ReturnType<typeof usePalette>;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.action,
        {
          backgroundColor: active ? activeColor : palette.surface,
          borderColor: active ? activeColor : palette.border,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Text style={{ color: active ? '#fff' : palette.text, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroFav: { position: 'absolute', right: 16, top: 56 },
  heroDex: { color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 16 },
  heroImage: { width: 220, height: 220 },
  body: { padding: 16 },
  name: { fontSize: 30, fontWeight: '900' },
  types: { flexDirection: 'row', gap: 8, marginTop: 10 },
  attrRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  attr: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 14, alignItems: 'center' },
  attrLabel: { fontSize: 13, fontWeight: '600' },
  attrValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  action: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  abilities: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  abilityText: { fontWeight: '700' },
  hidden: { fontSize: 12, fontStyle: 'italic' },
});
