import { apiClient } from './client';

export type DashboardDto = {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  createdAt?: string;
};

export async function listDashboards(): Promise<DashboardDto[]> {
  const { data } = await apiClient.get<DashboardDto[]>('/dashboards');
  return data;
}

export async function getDashboard(id: string): Promise<DashboardDto> {
  const { data } = await apiClient.get<DashboardDto>(`/dashboards/${id}`);
  return data;
}

export async function createDashboard(body: { name: string; description?: string }): Promise<DashboardDto> {
  const { data } = await apiClient.post<DashboardDto>('/dashboards', body);
  return data;
}

export async function updateDashboard(id: string, body: { name?: string; description?: string }): Promise<DashboardDto> {
  const { data } = await apiClient.put<DashboardDto>(`/dashboards/${id}`, body);
  return data;
}

export async function deleteDashboard(id: string): Promise<void> {
  await apiClient.delete(`/dashboards/${id}`);
}

export type DashboardMemberDto = { id: string; dashboardId: string; userId: string; role: string; active: boolean; createdAt: string };

export async function listDashboardMembers(dashboardId: string): Promise<DashboardMemberDto[]> {
  const { data } = await apiClient.get<DashboardMemberDto[]>(`/dashboards/${dashboardId}/members`);
  return data;
}

export async function addDashboardMember(dashboardId: string, body: { userId: string; role?: string }): Promise<DashboardMemberDto> {
  const { data } = await apiClient.post<DashboardMemberDto>(`/dashboards/${dashboardId}/members`, body);
  return data;
}

export async function removeDashboardMember(dashboardId: string, memberId: string): Promise<void> {
  await apiClient.delete(`/dashboards/${dashboardId}/members/${memberId}`);
}


