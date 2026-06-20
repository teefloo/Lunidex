import { Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';
import { usePrimeDexStore } from '@primedex/core';
import { usePalette } from '@/theme/ThemeProvider';

/**
 * Heart toggle bound to the shared store's `favorites`. Because it writes to the
 * same store the web app uses, favorites sync to the cloud for signed-in users.
 */
export function FavoriteButton({
  id,
  size = 22,
  style,
}: {
  id: number;
  size?: number;
  style?: ViewStyle;
}) {
  const palette = usePalette();
  const isFavorite = usePrimeDexStore((s) => s.favorites.includes(id));
  const addFavorite = usePrimeDexStore((s) => s.addFavorite);
  const removeFavorite = usePrimeDexStore((s) => s.removeFavorite);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      hitSlop={8}
      onPress={() => (isFavorite ? removeFavorite(id) : addFavorite(id))}
      style={[
        styles.btn,
        { backgroundColor: palette.surface, borderColor: palette.border },
        style,
      ]}
    >
      <Text style={{ fontSize: size, color: isFavorite ? palette.danger : palette.textFaint }}>
        {isFavorite ? '♥' : '♡'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
