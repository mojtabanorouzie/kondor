/**
 * Returns the active color palette, honoring the user's theme preference
 * (from SettingsProvider) and falling back to the system scheme.
 */

import { useContext } from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SchemeContext } from '@/theme/scheme-context';

export function useTheme() {
  const override = useContext(SchemeContext);
  const system = useColorScheme();
  const scheme = override ?? (system === 'dark' ? 'dark' : 'light');
  return Colors[scheme];
}
