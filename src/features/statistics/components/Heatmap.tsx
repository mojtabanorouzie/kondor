import Svg, { Rect } from 'react-native-svg';

import type { DayCount } from '../stats-service';

const CELL = 12;
const GAP = 3;
const EMPTY = 'rgba(127,127,127,0.12)';

function shade(count: number, max: number): string {
  if (count === 0) return EMPTY;
  const t = Math.min(count / Math.max(max, 1), 1);
  return `rgba(46,184,114,${(0.35 + 0.65 * t).toFixed(2)})`;
}

/** Calendar heatmap of daily review counts (weekday rows × week columns). */
export function Heatmap({ data }: { data: DayCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const firstWeekday = data[0] ? new Date(`${data[0].day}T00:00:00`).getDay() : 0;

  const cols = Math.ceil((data.length + firstWeekday) / 7);
  const width = cols * (CELL + GAP);
  const height = 7 * (CELL + GAP);

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const pos = i + firstWeekday;
        return (
          <Rect
            key={d.day}
            x={Math.floor(pos / 7) * (CELL + GAP)}
            y={(pos % 7) * (CELL + GAP)}
            width={CELL}
            height={CELL}
            rx={2}
            fill={shade(d.count, max)}
          />
        );
      })}
    </Svg>
  );
}
