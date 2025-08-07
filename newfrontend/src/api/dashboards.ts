import apiClient from './client';

export interface Dashboard {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
}

export async function fetchDashboards(): Promise<Dashboard[]> {
  const { data } = await apiClient.get<Dashboard[]>('/dashboards');
  return data;
}

export interface CreateDashboardRequest {
  name: string;
  description?: string;
}

export async function createDashboard(payload: CreateDashboardRequest): Promise<Dashboard> {
  const { data } = await apiClient.post<Dashboard>('/dashboards', payload);
  return data;
}

export async function fetchDashboard(dashboardId: string): Promise<Dashboard> {
  const { data } = await apiClient.get<Dashboard>(`/dashboards/${dashboardId}`);
  return data;
}

