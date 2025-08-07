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


