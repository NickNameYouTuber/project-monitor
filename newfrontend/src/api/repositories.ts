import apiClient from './client';

export interface Repository {
  id: string;
  name: string;
  description?: string | null;
  visibility?: 'public' | 'private';
  url?: string | null;
  project_id?: string | null;
}

export async function fetchRepositoriesByProject(projectId: string): Promise<Repository[]> {
  const { data } = await apiClient.get<Repository[]>('/repositories', {
    params: { project_id: projectId },
  });
  return data;
}


