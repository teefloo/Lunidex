import { Text, View, StyleSheet } from 'react-native';
import { usePalette } from '@/theme/ThemeProvider';
import { statLabel, MAX_BASE_STAT } from '@/lib/pokemon';

/** A single labelled base-stat bar (HP, ATK, ...). */
export function StatBar({ name, value }: { name: string; value: number }) {
  const palette = usePalette();
  const pct = Math.max(0.02, Math.min(1, value / MAX_BASE_STAT));
  const color =
    value >= 100 ? palette.success : value >= 60 ? palette.primary : palette.accent;

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: palette.textMuted }]}>{statLabel(name)}</Text>
      <Text style={[styles.value, { color: palette.text }]}>{value}</Text>
      <View style={[styles.track, { backgroundColor: palette.surfaceAlt }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  label: { width: 44, fontSize: 12, fontWeight: '700' },
  value: { width: 36, fontSize: 13, fontWeight: '600' },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
