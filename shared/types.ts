export type Priority = 1 | 2 | 3;

export type TaskStatus = 'pending' | 'active' | 'done';

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  priority: Priority;
  estimateMinutes: number;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface CreateTaskInput {
  title: string;
  notes?: string | null;
  priority: Priority;
  estimateMinutes: number;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string | null;
  priority?: Priority;
  estimateMinutes?: number;
}

export type TaskSortField = 'created' | 'priority' | 'estimate';
export type SortOrder = 'asc' | 'desc';

export interface TaskQuery {
  status?: TaskStatus;
  minPriority?: Priority;
  maxMinutes?: number;
  search?: string;
  sort?: TaskSortField;
  order?: SortOrder;
}

export interface ApiErrorBody {
  error: {
    message: string;
    details?: unknown;
  };
}
