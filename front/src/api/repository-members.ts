import { apiClient } from './client';

export type RepositoryMemberDto = { id: string; repositoryId?: string; userId: string; role: string; createdAt?: string };

export async function listRepositoryMembers(repositoryId: string): Promise<RepositoryMemberDto[]> {
  const { data } = await apiClient.get<RepositoryMemberDto[]>(`/repositories/${repositoryId}/members`);
  return data;
}

export async function addRepositoryMember(repositoryId: string, body: { userId: string; role?: string }): Promise<RepositoryMemberDto> {
  const { data } = await apiClient.post<RepositoryMemberDto>(`/repositories/${repositoryId}/members`, body);
  return data;
}

export async function removeRepositoryMember(repositoryId: string, memberId: string): Promise<void> {
  await apiClient.delete(`/repositories/${repositoryId}/members/${memberId}`);
}


