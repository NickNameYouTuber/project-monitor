import { apiClient } from './client';

export type TaskColumnDto = { id: string; name: string; orderIndex: number };

export async function listTaskColumns(projectId: string): Promise<TaskColumnDto[]> {
  const { data } = await apiClient.get<TaskColumnDto[]>(`/projects/${projectId}/task-columns`);
  return data;
}

export async function createTaskColumn(projectId: string, body: { name: string; orderIndex?: number }): Promise<TaskColumnDto> {
  const { data } = await apiClient.post<TaskColumnDto>(`/projects/${projectId}/task-columns`, body);
  return data;
}

export async function updateTaskColumn(projectId: string, columnId: string, body: { name?: string; order?: number }): Promise<TaskColumnDto> {
  const { data } = await apiClient.put<TaskColumnDto>(`/projects/${projectId}/task-columns/${columnId}`, body);
  return data;
}

export async function deleteTaskColumn(projectId: string, columnId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/task-columns/${columnId}`);
}

export async function reorderTaskColumns(projectId: string, columnIds: string[]): Promise<TaskColumnDto[]> {
  const { data } = await apiClient.put<TaskColumnDto[]>(`/projects/${projectId}/task-columns/reorder`, columnIds);
  return data;
}


