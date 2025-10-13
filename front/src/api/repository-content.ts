import { apiClient } from './client';

export type FileEntry = { path: string; type: 'blob' | 'tree'; size?: number; name: string };

export async function listFiles(repoId: string, ref: string, path?: string): Promise<FileEntry[]> {
  const { data } = await apiClient.get<any[]>(`/repositories/${repoId}/files`, { params: { ref, path } });
  return data.map(item => ({
    ...item,
    name: item.name || item.path.split('/').pop() || item.path
  }));
}

export async function getFileContent(repoId: string, ref: string, path: string): Promise<string> {
  const { data } = await apiClient.get<string>(`/repositories/${repoId}/file`, { params: { ref, path } });
  return data;
}

export async function listCommits(repoId: string, ref: string): Promise<any[]> {
  const { data } = await apiClient.get<any[]>(`/repositories/${repoId}/commits`, { params: { ref } });
  return data;
}

export async function getCommitDiff(repoId: string, sha: string): Promise<any> {
  const { data } = await apiClient.get<any>(`/repositories/${repoId}/commits/${sha}/diff`);
  return data;
}

export interface CommitDiff {
  commit: {
    sha: string;
    message: string;
    author: string;
    date: string;
  };
  files: FileDiff[];
}

export interface FileDiff {
  oldPath: string;
  newPath: string;
  changeType: 'ADD' | 'MODIFY' | 'DELETE' | 'RENAME' | 'COPY';
  oldContent: string;
  newContent: string;
  patch: string;
}

export async function getCommitDiffDetails(repoId: string, sha: string): Promise<CommitDiff> {
  const { data } = await apiClient.get<CommitDiff>(`/repositories/${repoId}/commits/${sha}/diff-details`);
  return data;
}


