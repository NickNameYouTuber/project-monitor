import apiClient from './client';

export interface Repository {
  id: string;
  name: string;
  description?: string | null;
  visibility: 'public' | 'private';
  project_id?: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchProjectRepositories(projectId: string): Promise<Repository[]> {
  const { data } = await apiClient.get<Repository[]>(`/repositories`, { params: { project_id: projectId } });
  return data;
}

export async function fetchRepository(repositoryId: string): Promise<Repository> {
  const { data } = await apiClient.get<Repository>(`/repositories/${repositoryId}`);
  return data;
}

export interface RepositoryCreate {
  name: string;
  description?: string;
  visibility?: 'public' | 'private' | 'internal';
  project_id?: string;
}

export interface RepositoryUpdate {
  name?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'internal';
}

export async function createRepository(payload: RepositoryCreate): Promise<Repository> {
  const { data } = await apiClient.post<Repository>('/repositories', payload);
  return data;
}

export async function updateRepository(repositoryId: string, payload: RepositoryUpdate): Promise<Repository> {
  const { data } = await apiClient.put<Repository>(`/repositories/${repositoryId}`, payload);
  return data;
}

export async function deleteRepository(repositoryId: string): Promise<void> {
  await apiClient.delete(`/repositories/${repositoryId}`);
}

export interface CloneInfo {
  https_url: string;
  ssh_url: string;
  web_url: string;
  clone_instructions?: { https?: string; ssh?: string; setup?: string };
}

export async function fetchCloneInfo(repositoryId: string): Promise<CloneInfo> {
  const { data } = await apiClient.get<CloneInfo>(`/repositories/${repositoryId}/clone-info`);
  return data;
}


