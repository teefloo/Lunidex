import { memo } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { usePrimeDexStore } from '@primedex/core';
import { usePalette } from '@/theme/ThemeProvider';
import { usePokemonDetail } from '@/api/hooks';
import { artworkUrl, formatDexId, formatName } from '@/lib/pokemon';
import { TypeBadge } from './TypeBadge';
import { FavoriteButton } from './FavoriteButton';

/**
 * Grid card for a single Pokémon. Identified by national-dex id so it can be
 * reused by the listing, favorites and team screens. Types are pulled from the
 * shared cached detail query; the artwork loads straight from the sprite CDN.
 */
function PokemonCardBase({ id }: { id: number }) {
  const palette = usePalette();
  const router = useRouter();
  const { data } = usePokemonDetail(id);
  const isCaught = usePrimeDexStore((s) => s.caughtPokemon.includes(id));

  const name = data?.name ?? '';
  const types = data?.types?.map((t) => t.type.name) ?? [];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name ? formatName(name) : `Pokémon ${id}`}
      onPress={() =>
        router.push({ pathname: '/pokemon/[name]', params: { name: String(name || id) } })
      }
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.dexId, { color: palette.textFaint }]}>{formatDexId(id)}</Text>
        <FavoriteButton id={id} size={18} style={styles.fav} />
      </View>

      <Image
        source={{ uri: artworkUrl(id) }}
        style={styles.image}
        contentFit="contain"
        transition={150}
      />

      <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
        {name ? formatName(name) : '…'}
      </Text>

      <View style={styles.types}>
        {types.map((type) => (
          <TypeBadge key={type} type={type} small />
        ))}
      </View>

      {isCaught ? (
        <View style={[styles.caught, { backgroundColor: palette.success }]}>
          <Text style={styles.caughtText}>✓</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    margin: 6,
    minHeight: 184,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dexId: { fontSize: 12, fontWeight: '700' },
  fav: { width: 30, height: 30, borderRadius: 15 },
  image: { width: '100%', height: 96, marginVertical: 6 },
  name: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  caught: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caughtText: { color: '#fff', fontSize: 11, fontWeight: '900' },
});

export const PokemonCard = memo(PokemonCardBase);
