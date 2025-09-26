import { apiClient } from './client';

export type ProjectDto = {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority?: string;
  assignee?: string;
  orderIndex?: number;
  color?: string;
  ownerId?: string;
  dashboardId?: string;
  createdAt?: string;
};

export type ProjectCreateRequest = {
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  orderIndex?: number;
  dashboardId?: string;
  color?: string;
};

export type ProjectUpdateRequest = Partial<ProjectCreateRequest>;

export async function listProjects(): Promise<ProjectDto[]> {
  const { data } = await apiClient.get<ProjectDto[]>('/projects');
  return data;
}

export async function getProject(id: string): Promise<ProjectDto> {
  const { data } = await apiClient.get<ProjectDto>(`/projects/${id}`);
  return data;
}

export async function createProject(body: ProjectCreateRequest): Promise<ProjectDto> {
  const { data } = await apiClient.post<ProjectDto>('/projects', body);
  return data;
}

export async function updateProject(id: string, body: ProjectUpdateRequest): Promise<ProjectDto> {
  const { data } = await apiClient.put<ProjectDto>(`/projects/${id}`, body);
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}

export async function updateProjectStatus(id: string, status: string): Promise<ProjectDto> {
  const { data } = await apiClient.patch<ProjectDto>(`/projects/${id}/status`, { status });
  return data;
}

export async function reorderProjects(body: { projectId: string; targetProjectId: string; position: 'above' | 'below' }): Promise<void> {
  await apiClient.post('/projects/reorder', body);
}


