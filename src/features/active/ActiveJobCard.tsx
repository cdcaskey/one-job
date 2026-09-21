import { useEffect, useState } from 'react';
import { Badge, Button, Card, Center, Group, Stack, Text, Title } from '@mantine/core';
import { formatEstimate } from '../../../shared/estimate.js';
import { priorityColor, priorityLabel } from '../../../shared/priority.js';
import type { Task } from '../../../shared/types.js';
import { useCancelTask, useCompleteTask } from '../../hooks/useTasks.js';

function formatElapsed(sinceMs: number, nowMs: number): string {
  const minutes = Math.floor((nowMs - sinceMs) / 60_000);
  if (minutes < 1) return 'just now';
  return `${formatEstimate(minutes)} ago`;
}

export function ActiveJobCard({ task }: { task: Task }) {
  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Center py="xl">
      <Card withBorder radius="lg" shadow="md" padding="xl" maw={480} w="100%">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Title order={1}>{task.title}</Title>
            <Badge color={priorityColor(task.priority)} size="lg">
              {priorityLabel(task.priority)}
            </Badge>
          </Group>
          <Text size="lg" c="dimmed">
            {formatEstimate(task.estimateMinutes)} · accepted {formatElapsed(task.updatedAt, now)}
          </Text>
          {task.notes && <Text>{task.notes}</Text>}
          <Group grow mt="md">
            <Button
              size="lg"
              color="green"
              loading={completeTask.isPending}
              onClick={() => completeTask.mutate(task.id)}
            >
              Done
            </Button>
          </Group>
          <Button
            variant="subtle"
            color="gray"
            loading={cancelTask.isPending}
            onClick={() => cancelTask.mutate(task.id)}
          >
            Cancel job
          </Button>
        </Stack>
      </Card>
    </Center>
  );
}
