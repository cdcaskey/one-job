import { Group, SegmentedControl, Text } from '@mantine/core';
import type { Priority } from '../../../shared/types.js';

const TIME_OPTIONS: { label: string; value: number | null }[] = [
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '4h', value: 240 },
  { label: 'No limit', value: null },
];

const PRIORITY_OPTIONS: { label: string; value: Priority | null }[] = [
  { label: 'Any', value: null },
  { label: 'Medium+', value: 2 },
  { label: 'High', value: 3 },
];

function toKey(value: number | null): string {
  return value === null ? 'none' : String(value);
}

interface FilterBarProps {
  maxMinutes: number | null;
  onMaxMinutesChange: (value: number | null) => void;
  minPriority: Priority | null;
  onMinPriorityChange: (value: Priority | null) => void;
  matchCount: number | undefined;
}

export function FilterBar({
  maxMinutes,
  onMaxMinutesChange,
  minPriority,
  onMinPriorityChange,
  matchCount,
}: FilterBarProps) {
  return (
    <Group justify="space-between" wrap="wrap" gap="md">
      <Group wrap="wrap" gap="md">
        <SegmentedControl
          aria-label="Time available"
          value={toKey(maxMinutes)}
          onChange={(key) => {
            const option = TIME_OPTIONS.find((o) => toKey(o.value) === key);
            onMaxMinutesChange(option?.value ?? null);
          }}
          data={TIME_OPTIONS.map((o) => ({ label: o.label, value: toKey(o.value) }))}
        />
        <SegmentedControl
          aria-label="Minimum priority"
          value={toKey(minPriority)}
          onChange={(key) => {
            const option = PRIORITY_OPTIONS.find((o) => toKey(o.value) === key);
            onMinPriorityChange(option?.value ?? null);
          }}
          data={PRIORITY_OPTIONS.map((o) => ({ label: o.label, value: toKey(o.value) }))}
        />
      </Group>
      <Text size="sm" c="dimmed">
        {matchCount === undefined ? '…' : `${matchCount} job${matchCount === 1 ? '' : 's'} match`}
      </Text>
    </Group>
  );
}
