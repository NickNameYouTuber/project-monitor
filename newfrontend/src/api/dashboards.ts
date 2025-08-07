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

