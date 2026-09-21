import { useState } from 'react';
import { ActionIcon, Button, Group, Popover, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { Task } from '../../../shared/types.js';
import { useDeleteTask } from '../../hooks/useTasks.js';

export function DeleteTaskButton({ task }: { task: Task }) {
  const [opened, setOpened] = useState(false);
  const deleteTask = useDeleteTask();

  return (
    <Popover opened={opened} onChange={setOpened} withArrow position="bottom-end">
      <Popover.Target>
        <ActionIcon
          color="red"
          variant="subtle"
          aria-label={`Delete "${task.title}"`}
          onClick={(e) => {
            e.stopPropagation();
            setOpened((o) => !o);
          }}
        >
          ✕
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown onClick={(e) => e.stopPropagation()}>
        <Stack gap="xs">
          <Text size="sm">Delete this task?</Text>
          <Group justify="flex-end" gap="xs">
            <Button size="xs" variant="default" onClick={() => setOpened(false)}>
              Cancel
            </Button>
            <Button
              size="xs"
              color="red"
              loading={deleteTask.isPending}
              onClick={() =>
                deleteTask.mutate(task.id, {
                  onSuccess: () => setOpened(false),
                  onError: (err) =>
                    notifications.show({
                      message: err instanceof Error ? err.message : 'Delete failed',
                      color: 'red',
                    }),
                })
              }
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
