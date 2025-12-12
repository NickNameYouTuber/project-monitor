import { apiClient } from './client';

export type RepositoryDto = {
  id: string;
  name: string;
  default_branch?: string;
  clone_url?: string;
  visibility?: string;
  description?: string;
  project_id?: string;
  created_at?: string;
};

export async function listRepositories(params?: { project_id?: string }): Promise<RepositoryDto[]> {
  const { data } = await apiClient.get<RepositoryDto[]>('/repositories', { params });
  return data;
}

export async function createRepository(body: { name: string; default_branch?: string; description?: string; visibility?: string; project_id?: string }): Promise<RepositoryDto> {
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
  try {
    const { data } = await apiClient.get<{ default: string }>(`/repositories/${repoId}/refs/default`);
    return data;
  } catch (error: any) {
    console.error('Ошибка получения default branch:', error);
    if (error.response?.status === 500) {
      return { default: 'main' };
    }
    throw error;
  }
}

export async function updateRepository(id: string, body: { name?: string; default_branch?: string; description?: string; visibility?: string }): Promise<RepositoryDto> {
  const { data } = await apiClient.put<RepositoryDto>(`/repositories/${id}`, body);
  return data;
}

export async function deleteRepository(id: string): Promise<void> {
  await apiClient.delete(`/repositories/${id}`);
}

export async function cloneRepository(body: { url: string; name: string; default_branch?: string; description?: string; visibility?: string; project_id?: string; auth_token?: string }): Promise<RepositoryDto> {
  const { data} = await apiClient.post<RepositoryDto>('/repositories/clone', body);
  return data;
}

export async function createBranch(repoId: string, branchName: string, fromRef?: string): Promise<{ name: string }> {
  const { data } = await apiClient.post<{ name: string }>(`/repositories/${repoId}/branches`, { name: branchName, from_ref: fromRef || 'HEAD' });
  return data;
}

export async function deleteBranch(repoId: string, branchName: string): Promise<void> {
  await apiClient.delete(`/repositories/${repoId}/branches/${branchName}`);
}

export async function updateFile(repoId: string, branch: string, path: string, content: string, message: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.put<{ success: boolean }>(`/repositories/${repoId}/files`, { branch, path, content, message });
  return data;
}

export async function deleteFile(repoId: string, branch: string, path: string, message?: string): Promise<void> {
  await apiClient.delete(`/repositories/${repoId}/files`, { params: { branch, path, message } });
}


