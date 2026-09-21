import { Button, Stack, Text } from '@mantine/core';
import { Link } from 'react-router';

interface EmptyStateProps {
  hasAnyPendingTasks: boolean;
  onWidenFilters: () => void;
}

export function EmptyState({ hasAnyPendingTasks, onWidenFilters }: EmptyStateProps) {
  if (!hasAnyPendingTasks) {
    return (
      <Stack align="center" gap="xs" py="xl">
        <Text size="lg" fw={500}>
          You have no jobs.
        </Text>
        <Button component={Link} to="/tasks">
          Add a task
        </Button>
      </Stack>
    );
  }

  return (
    <Stack align="center" gap="xs" py="xl">
      <Text size="lg" fw={500}>
        No jobs match these filters.
      </Text>
      <Button variant="default" onClick={onWidenFilters}>
        Show all priorities and times
      </Button>
    </Stack>
  );
}
