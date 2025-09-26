import { apiClient } from './client';

export type RepositoryDto = {
  id: string;
  name: string;
  default_branch?: string;
  project_id?: string;
  created_at?: string;
};

export async function listRepositories(params?: { project_id?: string }): Promise<RepositoryDto[]> {
  const { data } = await apiClient.get<RepositoryDto[]>('/repositories', { params });
  return data;
}

export async function createRepository(body: { name: string; default_branch?: string; project_id?: string }): Promise<RepositoryDto> {
  const { data } = await apiClient.post<RepositoryDto>('/repositories', body);
  return data;
}

export async function getBranches(repoId: string): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`/repositories/${repoId}/refs/branches`);
  return data as unknown as string[];
}

export async function getTags(repoId: string): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`/repositories/${repoId}/refs/tags`);
  return data as unknown as string[];
}

export async function getDefaultBranch(repoId: string): Promise<{ default: string }> {
  const { data } = await apiClient.get<{ default: string }>(`/repositories/${repoId}/refs/default`);
  return data;
}


