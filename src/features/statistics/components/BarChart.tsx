import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export interface BarChartProps {
  values: number[];
  height?: number;
  color?: string;
  /** Caption shown under the chart (e.g. the date range). */
  caption?: string;
}

/** A minimal responsive bar chart. Width is measured from its container. */
export function BarChart({ values, height = 120, color = '#3c87f7', caption }: BarChartProps) {
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...values);
  const n = values.length;
  const gap = n > 60 ? 1 : 2;
  const barWidth = n > 0 ? Math.max((width - gap * (n - 1)) / n, 1) : 0;

  return (
    <View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {values.map((v, i) => {
              const h = (v / max) * height;
              return (
                <Rect
                  key={i}
                  x={i * (barWidth + gap)}
                  y={height - h}
                  width={barWidth}
                  height={h}
                  rx={2}
                  fill={v === 0 ? 'rgba(127,127,127,0.15)' : color}
                />
              );
            })}
          </Svg>
        )}
      </View>
      {caption ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.caption}>
          {caption}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { marginTop: Spacing.one, textAlign: 'center' },
});
