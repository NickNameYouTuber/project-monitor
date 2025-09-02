import apiClient from './client';

export interface Task {
  id: string;
  title: string;
  description?: string;
  column_id: string;
  project_id: string;
  order: number;
  reviewer_id?: string | null;
  due_date?: string | null;
  estimate_minutes?: number | null;
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
  due_date?: string | null;
  estimate_minutes?: number | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  column_id?: string;
  order?: number;
  assignee_ids?: string[];
  reviewer_id?: string | null;
  due_date?: string | null;
  estimate_minutes?: number | null;
}

export interface TaskMove {
  column_id: string;
  order: number;
}

export async function createTask(projectId: string, payload: TaskCreate): Promise<Task> {
  const { data } = await apiClient.post<Task>(`/projects/${projectId}/tasks`, payload);
  return data;
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  const { data } = await apiClient.get<Task[]>(`/projects/${projectId}/tasks`);
  return data;
}

export async function updateTask(projectId: string, taskId: string, payload: TaskUpdate): Promise<Task> {
  const { data } = await apiClient.put<Task>(`/projects/${projectId}/tasks/${taskId}`, payload);
  return data;
}

export async function moveTask(projectId: string, taskId: string, payload: TaskMove): Promise<Task> {
  const { data } = await apiClient.put<Task>(`/projects/${projectId}/tasks/${taskId}/move`, payload);
  return data;
}

export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`);
}

export async function reorderColumnTasks(projectId: string, columnId: string, taskIds: string[]): Promise<Task[]> {
  const { data } = await apiClient.put<Task[]>(`/projects/${projectId}/tasks/column/${columnId}/reorder`, { task_ids: taskIds });
  return data;
}


