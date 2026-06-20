import type { ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { usePalette } from '@/theme/ThemeProvider';

interface ScreenProps {
  children: ReactNode;
  /** Apply top safe-area padding (screens with their own header can disable). */
  edges?: { top?: boolean; bottom?: boolean };
  style?: ViewStyle;
}

/** Themed, safe-area-aware page container. */
export function Screen({ children, edges = { top: true }, style }: ScreenProps) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: palette.background,
          paddingTop: edges.top ? insets.top : 0,
          paddingBottom: edges.bottom ? insets.bottom : 0,
        },
        style,
      ]}
    >
      <StatusBar style={palette.mode === 'dark' ? 'light' : 'dark'} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
