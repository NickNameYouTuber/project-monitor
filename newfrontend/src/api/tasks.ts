import apiClient from './client';

export interface Task {
  id: string;
  title: string;
  description?: string;
  column_id: string;
  project_id: string;
  order: number;
  reviewer_id?: string | null;
  created_at: string;
  updated_at: string;
  assignees?: { id: string; username: string }[];
}

export interface TaskCreate {
  title: string;
  description?: string;
  column_id: string;
  project_id: string;
  order?: number;
  assignee_ids?: string[];
  reviewer_id?: string | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  column_id?: string;
  order?: number;
  assignee_ids?: string[];
  reviewer_id?: string | null;
}

export interface TaskMove {
  column_id: string;
  order: number;
}

export async function createTask(payload: TaskCreate): Promise<Task> {
  const { data } = await apiClient.post<Task>('/tasks', payload);
  return data;
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  const { data } = await apiClient.get<Task[]>(`/tasks/project/${projectId}`);
  return data;
}

export async function updateTask(taskId: string, payload: TaskUpdate): Promise<Task> {
  const { data } = await apiClient.put<Task>(`/tasks/${taskId}`, payload);
  return data;
}

export async function moveTask(taskId: string, payload: TaskMove): Promise<Task> {
  const { data } = await apiClient.put<Task>(`/tasks/${taskId}/move`, payload);
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}`);
}

export async function reorderColumnTasks(columnId: string, taskIds: string[]): Promise<Task[]> {
  const { data } = await apiClient.put<Task[]>(`/tasks/column/${columnId}/reorder`, { task_ids: taskIds });
  return data;
}


