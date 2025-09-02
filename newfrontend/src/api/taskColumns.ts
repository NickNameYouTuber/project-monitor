import apiClient from './client';

export interface TaskColumn {
  id: string;
  name: string;
  order: number;
}

export interface TaskColumnCreate {
  name: string;
  order?: number;
}

export interface TaskColumnUpdate {
  name?: string;
  order?: number;
}

export async function createTaskColumn(projectId: string, payload: TaskColumnCreate): Promise<TaskColumn> {
  const { data } = await apiClient.post<TaskColumn>(`/projects/${projectId}/task-columns`, payload);
  return data;
}

export async function getProjectTaskColumns(projectId: string): Promise<TaskColumn[]> {
  const { data } = await apiClient.get<TaskColumn[]>(`/projects/${projectId}/task-columns`);
  return data;
}

export async function updateTaskColumn(projectId: string, columnId: string, payload: TaskColumnUpdate): Promise<TaskColumn> {
  const { data } = await apiClient.put<TaskColumn>(`/projects/${projectId}/task-columns/${columnId}`, payload);
  return data;
}

export async function deleteTaskColumn(projectId: string, columnId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/task-columns/${columnId}`);
}

export async function reorderTaskColumns(projectId: string, columnIds: string[]): Promise<TaskColumn[]> {
  const { data } = await apiClient.put<TaskColumn[]>(`/projects/${projectId}/task-columns/reorder`, columnIds);
  return data;
}


