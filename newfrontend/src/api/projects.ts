import apiClient from './client';

export type ProjectStatus = 'inPlans' | 'inProgress' | 'onPause' | 'completed';
export type ProjectPriority = 'high' | 'medium' | 'low';

export interface ProjectCreateRequest {
  name: string;
  description?: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  assignee: string;
  order: number;
  dashboard_id?: string | null;
}

export interface ProjectResponse extends ProjectCreateRequest {
  id: string;
  created_at: string;
  owner_id: string;
}

export async function createProject(payload: ProjectCreateRequest): Promise<ProjectResponse> {
  const { data } = await apiClient.post<ProjectResponse>('/projects', payload);
  return data;
}


