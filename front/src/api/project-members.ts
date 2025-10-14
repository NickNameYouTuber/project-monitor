import { apiClient } from './client';

export type ProjectMemberDto = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
  user?: {
    id: string;
    username: string;
    display_name?: string;
  };
};

export async function listProjectMembers(projectId: string): Promise<ProjectMemberDto[]> {
  const { data } = await apiClient.get<ProjectMemberDto[]>(`/projects/${projectId}/members`);
  return data;
}

export async function addProjectMember(projectId: string, userId: string, role: string): Promise<ProjectMemberDto> {
  const { data } = await apiClient.post<ProjectMemberDto>(`/projects/${projectId}/members`, { 
    user_id: userId, 
    role 
  });
  return data;
}

export async function removeProjectMember(projectId: string, memberId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/members/${memberId}`);
}

export async function updateProjectMemberRole(projectId: string, memberId: string, role: string): Promise<ProjectMemberDto> {
  const { data } = await apiClient.patch<ProjectMemberDto>(`/projects/${projectId}/members/${memberId}/role`, { role });
  return data;
}

