import apiClient from './client';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  column_id: string;
  project_id: string;
  assignees: Array<{ id: string; username: string }>;
}

export interface TaskCreate {
  title: string;
  description?: string;
  order?: number;
  column_id: string;
  project_id: string;
  assignee_ids?: string[];
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  column_id?: string;
  order?: number;
  assignee_ids?: string[];
}

export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
  const { data } = await apiClient.get<Task[]>(`/tasks/project/${projectId}`);
  return data;
}

export async function fetchColumnTasks(columnId: string): Promise<Task[]> {
  const { data } = await apiClient.get<Task[]>(`/tasks/column/${columnId}`);
  return data;
}

export async function createTask(payload: TaskCreate): Promise<Task> {
  const { data } = await apiClient.post<Task>('/tasks', payload);
  return data;
}

export async function updateTask(taskId: string, payload: TaskUpdate): Promise<Task> {
  const { data } = await apiClient.put<Task>(`/tasks/${taskId}`, payload);
  return data;
}

export async function moveTask(taskId: string, payload: { column_id: string; order: number }): Promise<Task> {
  const { data } = await apiClient.put<Task>(`/tasks/${taskId}/move`, payload);
  return data;
}

export async function reorderTasks(columnId: string, taskIds: string[]): Promise<Task[]> {
  const { data } = await apiClient.put<Task[]>(`/tasks/column/${columnId}/reorder`, taskIds);
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}`);
}


