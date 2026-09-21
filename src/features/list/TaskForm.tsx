import { useEffect, useMemo } from 'react';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createTaskSchema } from '../../../shared/validation.js';
import { toMinutes, type EstimateUnit } from '../../../shared/estimate.js';
import { PRIORITIES, priorityLabel } from '../../../shared/priority.js';
import type { Priority, Task } from '../../../shared/types.js';
import { useCreateTask, useUpdateTask } from '../../hooks/useTasks.js';

interface TaskFormValues {
  title: string;
  notes: string;
  priority: Priority;
  estimateValue: number;
  estimateUnit: EstimateUnit;
}

// Minutes -> value+unit has no single right answer (120 could be "2
// hours" or "120 minutes"); pick the largest unit that divides evenly
// so edits round-trip cleanly for anything actually created through
// this form's own unit selector.
function minutesToDisplay(minutes: number): { value: number; unit: EstimateUnit } {
  if (minutes >= 480 && minutes % 480 === 0) return { value: minutes / 480, unit: 'days' };
  if (minutes >= 60 && minutes % 60 === 0) return { value: minutes / 60, unit: 'hours' };
  return { value: minutes, unit: 'minutes' };
}

interface TaskFormProps {
  opened: boolean;
  onClose: () => void;
  task?: Task;
}

export function TaskForm({ opened, onClose, task }: TaskFormProps) {
  const isEdit = task !== undefined;
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const initial = useMemo<TaskFormValues>(() => {
    if (!task) {
      return { title: '', notes: '', priority: 2, estimateValue: 30, estimateUnit: 'minutes' };
    }
    const { value, unit } = minutesToDisplay(task.estimateMinutes);
    return {
      title: task.title,
      notes: task.notes ?? '',
      priority: task.priority,
      estimateValue: value,
      estimateUnit: unit,
    };
  }, [task]);

  const form = useForm<TaskFormValues>({
    initialValues: initial,
    validate: (values) => {
      const result = createTaskSchema.safeParse({
        title: values.title,
        notes: values.notes.trim() === '' ? null : values.notes,
        priority: values.priority,
        estimateMinutes: toMinutes(values.estimateValue, values.estimateUnit),
      });
      if (result.success) return {};
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? 'title');
        errors[key === 'estimateMinutes' ? 'estimateValue' : key] ??= issue.message;
      }
      return errors;
    },
  });

  useEffect(() => {
    // The modal stays mounted between opens, so without this, editing
    // task A then opening task B (or a fresh create) would still show
    // A's values until the user touched every field themselves.
    if (opened) form.setValues(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form's identity is unstable across renders; including it would loop.
  }, [opened, initial]);

  const pending = createTask.isPending || updateTask.isPending;

  const handleSubmit = form.onSubmit(async (values) => {
    const input = {
      title: values.title.trim(),
      notes: values.notes.trim() === '' ? null : values.notes.trim(),
      priority: values.priority,
      estimateMinutes: toMinutes(values.estimateValue, values.estimateUnit),
    };
    try {
      if (isEdit) {
        await updateTask.mutateAsync({ id: task.id, input });
        notifications.show({ message: 'Task updated', color: 'green' });
      } else {
        await createTask.mutateAsync(input);
        notifications.show({ message: 'Task created', color: 'green' });
      }
      onClose();
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : 'Something went wrong',
        color: 'red',
      });
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Edit task' : 'New task'}>
      <form onSubmit={handleSubmit}>
        <Stack>
          {/* No native `required` — a second, inconsistent validation
              path on top of the shared zod schema below. */}
          <TextInput label="Title" {...form.getInputProps('title')} />
          <Textarea label="Notes" autosize minRows={2} {...form.getInputProps('notes')} />
          <Select
            label="Priority"
            allowDeselect={false}
            data={PRIORITIES.map((p) => ({ value: String(p), label: priorityLabel(p) }))}
            value={String(form.values.priority)}
            onChange={(value) => form.setFieldValue('priority', Number(value) as Priority)}
          />
          <Group grow align="flex-end">
            <NumberInput
              label="Estimate"
              min={1}
              error={form.errors.estimateValue}
              value={form.values.estimateValue}
              onChange={(value) => form.setFieldValue('estimateValue', Number(value) || 0)}
            />
            <Select
              label="Unit"
              allowDeselect={false}
              data={[
                { value: 'minutes', label: 'minutes' },
                { value: 'hours', label: 'hours' },
                { value: 'days', label: 'days (8h)' },
              ]}
              value={form.values.estimateUnit}
              onChange={(value) =>
                form.setFieldValue('estimateUnit', (value ?? 'minutes') as EstimateUnit)
              }
            />
          </Group>
          <Group justify="flex-end">
            <Button variant="default" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
