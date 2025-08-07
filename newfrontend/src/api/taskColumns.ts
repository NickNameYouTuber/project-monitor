import apiClient from './client';

export interface TaskColumn {
  id: string;
  name: string;
  order: number;
  project_id: string;
}

export interface TaskColumnCreate {
  name: string;
  project_id: string;
  order?: number;
}

export interface TaskColumnUpdate {
  name?: string;
  order?: number;
}

export async function fetchProjectColumns(projectId: string): Promise<TaskColumn[]> {
  const { data } = await apiClient.get<TaskColumn[]>(`/task-columns/project/${projectId}`);
  return data;
}

export async function createTaskColumn(payload: TaskColumnCreate): Promise<TaskColumn> {
  const { data } = await apiClient.post<TaskColumn>('/task-columns', payload);
  return data;
}

export async function updateTaskColumn(columnId: string, payload: TaskColumnUpdate): Promise<TaskColumn> {
  const { data } = await apiClient.put<TaskColumn>(`/task-columns/${columnId}`, payload);
  return data;
}

export async function deleteTaskColumn(columnId: string): Promise<void> {
  await apiClient.delete(`/task-columns/${columnId}`);
}

export async function reorderTaskColumns(projectId: string, columnIds: string[]): Promise<TaskColumn[]> {
  const { data } = await apiClient.put<TaskColumn[]>(`/task-columns/reorder/${projectId}`, columnIds);
  return data;
}


