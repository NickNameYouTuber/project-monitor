import apiClient from './client';

export interface TaskColumn {
  id: string;
  name: string;
  project_id: string;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  column_id: string;
  project_id: string;
  order: number;
}

export async function fetchProjectColumns(projectId: string): Promise<TaskColumn[]> {
  const { data } = await apiClient.get<TaskColumn[]>(`/task-columns/project/${projectId}`);
  return data;
}

export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
  const { data } = await apiClient.get<Task[]>(`/tasks/project/${projectId}`);
  return data;
}


