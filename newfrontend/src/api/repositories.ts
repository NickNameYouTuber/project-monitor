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


