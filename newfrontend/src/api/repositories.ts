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

export interface GitFileContent {
  name: string;
  path: string;
  content: string;
  encoding: 'utf-8' | 'base64';
  size: number;
  binary: boolean;
}

export async function fetchFileContent(repositoryId: string, path: string, branch?: string): Promise<GitFileContent> {
  const { data } = await apiClient.get<GitFileContent>(`/repositories/${repositoryId}/content/${encodeURIComponent(path)}`, {
    params: { branch }
  });
  return data;
}

export interface GitBranch {
  name: string;
  is_default?: boolean;
}

export async function listBranches(repositoryId: string): Promise<GitBranch[]> {
  const { data } = await apiClient.get<GitBranch[]>(`/repositories/${repositoryId}/branches`);
  return data;
}

export async function createBranch(repositoryId: string, name: string, base_branch?: string, task_id?: string): Promise<{ name: string; base_branch: string; success: boolean }> {
  const { data } = await apiClient.post(`/repositories/${repositoryId}/branches`, { name, base_branch, task_id });
  return data;
}

export interface GitCommitShort {
  hash: string;
  short_hash: string;
  author: string;
  author_email?: string;
  message: string;
  date: string;
  stats?: { files_changed?: number; insertions?: number; deletions?: number };
}

export async function listCommits(repositoryId: string, params?: { path?: string; branch?: string; limit?: number; skip?: number }): Promise<GitCommitShort[]> {
  const { data } = await apiClient.get<GitCommitShort[]>(`/repositories/${repositoryId}/commits`, { params });
  return data;
}

export interface GitCommitFileChange {
  path: string;
  old_path?: string | null;
  change_type: 'added' | 'deleted' | 'renamed' | 'modified' | 'unknown';
  additions?: number;
  deletions?: number;
  diff?: string;
}

export interface GitCommitDetail {
  hash: string;
  author: string;
  committer: string;
  message: string;
  date: string;
  parent_hashes: string[];
  files: GitCommitFileChange[];
}

export async function getCommitDetail(repositoryId: string, commitHash: string): Promise<GitCommitDetail> {
  const { data } = await apiClient.get<GitCommitDetail>(`/repositories/${repositoryId}/commits/${commitHash}`);
  return data;
}


