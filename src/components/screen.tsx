import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ScreenProps extends ViewProps {
  /** Apply horizontal/vertical padding. Disable for full-bleed lists. */
  padded?: boolean;
}

/** A themed, flex-filling screen background. */
export function Screen({ padded = true, style, ...rest }: ScreenProps) {
  const theme = useTheme();
  return (
    <View
      style={[styles.screen, { backgroundColor: theme.background }, padded && styles.padded, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  padded: { padding: Spacing.four, gap: Spacing.three },
});
