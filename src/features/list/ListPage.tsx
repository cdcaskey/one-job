import { useState } from 'react';
import { Badge, Button, Group, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { formatEstimate } from '../../../shared/estimate.js';
import { PRIORITIES, priorityColor, priorityLabel } from '../../../shared/priority.js';
import type { Priority, Task, TaskSortField, TaskStatus } from '../../../shared/types.js';
import { useTasks } from '../../hooks/useTasks.js';
import { TaskForm } from './TaskForm.js';
import { DeleteTaskButton } from './DeleteTaskButton.js';

// Only created/priority/estimate are sortable: that's the full set
// the API supports (sorting happens in SQL, not by fetching
// everything and sorting client-side), so title/status stay plain,
// unsortable columns rather than faking client-side sort for them.
const SORTABLE_COLUMNS: { field: TaskSortField; label: string }[] = [
  { field: 'priority', label: 'Priority' },
  { field: 'estimate', label: 'Estimate' },
  { field: 'created', label: 'Created' },
];

export function ListPage() {
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [minPriority, setMinPriority] = useState<Priority | ''>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<TaskSortField>('created');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [formOpened, setFormOpened] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  const { data: tasks, isLoading } = useTasks({
    ...(status && { status }),
    ...(minPriority && { minPriority }),
    ...(search.trim() && { search: search.trim() }),
    sort,
    order,
  });

  function toggleSort(field: TaskSortField) {
    if (sort === field) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setOrder('desc');
    }
  }

  function openCreate() {
    setEditingTask(undefined);
    setFormOpened(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setFormOpened(true);
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Tasks</Title>
        <Button onClick={openCreate}>New task</Button>
      </Group>

      <Group wrap="wrap">
        <TextInput
          placeholder="Search title…"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={220}
        />
        <Select
          placeholder="Status"
          data={[
            { value: 'pending', label: 'Pending' },
            { value: 'active', label: 'Active' },
            { value: 'done', label: 'Done' },
          ]}
          value={status || null}
          onChange={(value) => setStatus((value as TaskStatus) || '')}
          clearable
          w={140}
        />
        <Select
          placeholder="Min priority"
          data={PRIORITIES.map((p) => ({ value: String(p), label: priorityLabel(p) }))}
          value={minPriority ? String(minPriority) : null}
          onChange={(value) => setMinPriority(value ? (Number(value) as Priority) : '')}
          clearable
          w={160}
        />
      </Group>

      <Table.ScrollContainer minWidth={640}>
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Title</Table.Th>
              {SORTABLE_COLUMNS.map(({ field, label }) => (
                <Table.Th
                  key={field}
                  onClick={() => toggleSort(field)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  {label} {sort === field ? (order === 'asc' ? '▲' : '▼') : ''}
                </Table.Th>
              ))}
              <Table.Th>Status</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed">Loading…</Text>
                </Table.Td>
              </Table.Tr>
            )}
            {!isLoading && tasks?.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed">No tasks match these filters.</Text>
                </Table.Td>
              </Table.Tr>
            )}
            {tasks?.map((task) => (
              <Table.Tr
                key={task.id}
                onClick={() => openEdit(task)}
                bg={task.status === 'active' ? 'var(--mantine-color-blue-light)' : undefined}
                style={{ cursor: 'pointer' }}
              >
                <Table.Td>{task.title}</Table.Td>
                <Table.Td>
                  <Badge color={priorityColor(task.priority)} variant="light">
                    {priorityLabel(task.priority)}
                  </Badge>
                </Table.Td>
                <Table.Td>{formatEstimate(task.estimateMinutes)}</Table.Td>
                <Table.Td>{new Date(task.createdAt).toLocaleDateString()}</Table.Td>
                <Table.Td>
                  {task.status === 'active' ? (
                    <Badge color="blue">Active</Badge>
                  ) : task.status === 'done' ? (
                    <Badge color="gray" variant="light">
                      Done
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="outline">
                      Pending
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  {task.status !== 'active' && <DeleteTaskButton task={task} />}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <TaskForm opened={formOpened} onClose={() => setFormOpened(false)} task={editingTask} />
    </Stack>
  );
}
