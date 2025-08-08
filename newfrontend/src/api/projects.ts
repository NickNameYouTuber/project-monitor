import apiClient from './client';

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: 'inPlans' | 'inProgress' | 'onPause' | 'completed';
  priority: 'high' | 'medium' | 'low';
  order: number;
  dashboard_id?: string | null;
}

export async function fetchProjectsByDashboard(dashboardId: string): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>(`/projects`, { params: { dashboard_id: dashboardId } });
  return data;
}

export async function fetchProject(projectId: string): Promise<Project> {
  const { data } = await apiClient.get<Project>(`/projects/${projectId}`);
  return data;
}

export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  status?: 'inPlans' | 'inProgress' | 'onPause' | 'completed';
  priority?: 'high' | 'medium' | 'low';
  order?: number;
  dashboard_id?: string | null;
}

export async function updateProject(projectId: string, payload: ProjectUpdate): Promise<Project> {
  const { data } = await apiClient.put<Project>(`/projects/${projectId}`, payload);
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}`);
}

export async function updateProjectStatus(projectId: string, status: Project['status']): Promise<Project> {
  const { data } = await apiClient.patch<Project>(`/projects/${projectId}/status`, { status });
  return data;
}

export async function reorderProjects(projectId: string, targetProjectId: string, position: 'above' | 'below'): Promise<{ success: boolean }> {
  const { data } = await apiClient.post<{ success: boolean }>(`/projects/reorder`, {
    projectId,
    targetProjectId,
    position,
  });
  return data;
}


