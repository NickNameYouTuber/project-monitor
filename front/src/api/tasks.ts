import { apiClient } from './client';

export type TaskDto = {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  projectId: string;
  order: number;
  reviewerId?: string | null;
  dueDate?: string | null;
  estimateMinutes?: number | null;
  createdAt?: string;
  updatedAt?: string;
  repositoryId?: string | null;
  repositoryBranch?: string | null;
};

function normalizeTask(raw: any): TaskDto {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? undefined,
    columnId: raw.columnId ?? raw.column_id,
    projectId: raw.projectId ?? raw.project_id,
    order: raw.order ?? 0,
    reviewerId: raw.reviewerId ?? raw.reviewer_id ?? null,
    dueDate: raw.dueDate ?? raw.due_date ?? null,
    estimateMinutes: raw.estimateMinutes ?? raw.estimate_minutes ?? null,
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
    repositoryId: raw.repositoryId ?? raw.repository_id ?? null,
    repositoryBranch: raw.repositoryBranch ?? raw.repository_branch ?? null,
  };
}

export async function listTasks(projectId: string): Promise<TaskDto[]> {
  const { data } = await apiClient.get(`/projects/${projectId}/tasks`);
  return Array.isArray(data) ? data.map(normalizeTask) : [];
}

export async function createTask(projectId: string, body: { title: string; description?: string; column_id: string; order?: number; repository_id?: string; repository_branch?: string }): Promise<TaskDto> {
  const { data } = await apiClient.post(`/projects/${projectId}/tasks`, body);
  return normalizeTask(data);
}

export async function updateTask(projectId: string, taskId: string, body: { title?: string; description?: string; column_id?: string; order?: number }): Promise<TaskDto> {
  const { data } = await apiClient.put(`/projects/${projectId}/tasks/${taskId}`, body);
  return normalizeTask(data);
}

export async function moveTask(projectId: string, taskId: string, body: { column_id?: string; order?: number }): Promise<TaskDto> {
  const { data } = await apiClient.put(`/projects/${projectId}/tasks/${taskId}/move`, body);
  return normalizeTask(data);
}

export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`);
}

export async function reorderTasksInColumn(projectId: string, columnId: string, taskIds: string[]): Promise<TaskDto[]> {
  const { data } = await apiClient.put(`/projects/${projectId}/tasks/column/${columnId}/reorder`, { task_ids: taskIds });
  return Array.isArray(data) ? data.map(normalizeTask) : [];
}

export interface TaskFromChatRequest {
  title: string;
  description?: string;
  assignee_username?: string;
  watcher_username?: string;
  deadline?: string;
  project_id?: string;
  parent_task_id?: string;
  room_id?: string;
}

export async function createTaskFromChat(request: TaskFromChatRequest): Promise<TaskDto> {
  const { data } = await apiClient.post('/tasks/from-chat', request);
  return normalizeTask(data);
}

export async function getTask(taskId: string): Promise<TaskDto> {
  const { data } = await apiClient.get(`/tasks/${taskId}`);
  return normalizeTask(data);
}

export async function listRepositoryTasks(repositoryId: string): Promise<TaskDto[]> {
  const { data } = await apiClient.get(`/repositories/${repositoryId}/tasks`);
  return Array.isArray(data) ? data.map(normalizeTask) : [];
}


