import { apiClient } from './client';

export type RepositoryMemberDto = {
  id: string;
  repository_id: string;
  user_id: string;
  username?: string;
  role: string;
  created_at: string;
};

export async function listMembers(repoId: string): Promise<RepositoryMemberDto[]> {
  const { data } = await apiClient.get<RepositoryMemberDto[]>(`/repositories/${repoId}/members`);
  return data;
}

export async function addMember(repoId: string, userId: string, role: string): Promise<RepositoryMemberDto> {
  const { data } = await apiClient.post<RepositoryMemberDto>(`/repositories/${repoId}/members`, { userId, role });
  return data;
}

export async function removeMember(repoId: string, memberId: string): Promise<void> {
  await apiClient.delete(`/repositories/${repoId}/members/${memberId}`);
}
