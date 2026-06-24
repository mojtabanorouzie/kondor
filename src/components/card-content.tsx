import { Image } from 'expo-image';
import { Fragment } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const IMAGE_RE = /^!\[[^\]]*\]\(([^)]+)\)$/;
const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

export interface CardContentProps {
  /** Lightweight markdown: **bold**, *italic*, `code`, and image-only lines. */
  content: string;
  type?: ThemedTextProps['type'];
  align?: TextStyle['textAlign'];
}

/**
 * Renders a card's content with a small, dependency-free markdown subset that
 * works identically on web and native: bold, italic, inline code, and images
 * (a line that is solely `![alt](url)`).
 */
export function CardContent({ content, type = 'default', align = 'center' }: CardContentProps) {
  const theme = useTheme();
  const lines = content.split('\n');

  return (
    <View style={styles.container}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const image = trimmed.match(IMAGE_RE);
        if (image) {
          return (
            <Image key={i} source={{ uri: image[1] }} style={styles.image} contentFit="contain" />
          );
        }
        if (trimmed === '') {
          return <View key={i} style={styles.spacer} />;
        }
        return (
          <ThemedText key={i} type={type} style={{ textAlign: align }}>
            {renderInline(line, theme.backgroundElement)}
          </ThemedText>
        );
      })}
    </View>
  );
}

function renderInline(line: string, codeBg: string) {
  const parts = line.split(INLINE_RE).filter((p) => p.length > 0);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <Text key={i} style={styles.italic}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <Text key={i} style={[styles.code, { backgroundColor: codeBg }]}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one, alignSelf: 'stretch' },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  code: {
    fontFamily: 'monospace',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: Spacing.two,
  },
  spacer: { height: Spacing.three },
});
