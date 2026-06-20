import { Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { typeColor, formatName } from '@/lib/pokemon';

/** Colored pill for a Pokémon type, localized via the shared i18n bundles. */
export function TypeBadge({ type, small = false }: { type: string; small?: boolean }) {
  const { t } = useTranslation();
  const label = t(`types.${type}`, { defaultValue: formatName(type) });

  return (
    <View
      style={[
        styles.badge,
        small && styles.badgeSmall,
        { backgroundColor: typeColor(type) },
      ]}
    >
      <Text style={[styles.text, small && styles.textSmall]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeSmall: { paddingHorizontal: 8, paddingVertical: 2 },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  textSmall: { fontSize: 11 },
});
