import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, toQueryString } from '../api/client.js';
import type { CreateTaskInput, Task, TaskQuery, UpdateTaskInput } from '../../shared/types.js';

export const taskKeys = {
  all: ['tasks'] as const,
  list: (query: TaskQuery) => ['tasks', 'list', query] as const,
  active: ['tasks', 'active'] as const,
};

export function useTasks(query: TaskQuery = {}) {
  return useQuery({
    queryKey: taskKeys.list(query),
    queryFn: () => apiClient.get<Task[]>(`/tasks${toQueryString(query)}`),
  });
}

export function useActiveTask() {
  return useQuery({
    queryKey: taskKeys.active,
    queryFn: () => apiClient.get<Task | null>('/tasks/active'),
  });
}

function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: taskKeys.all });
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => apiClient.post<Task>('/tasks', input),
    onSuccess: invalidate,
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      apiClient.patch<Task>(`/tasks/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/tasks/${id}`),
    onSuccess: invalidate,
  });
}

export function useAcceptTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<Task>(`/tasks/${id}/accept`),
    onSuccess: invalidate,
  });
}

export function useCancelTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<Task>(`/tasks/${id}/cancel`),
    onSuccess: invalidate,
  });
}

export function useCompleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<Task>(`/tasks/${id}/complete`),
    onSuccess: invalidate,
  });
}
