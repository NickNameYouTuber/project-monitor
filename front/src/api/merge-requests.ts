import { apiClient } from './client';

export type MergeRequestDto = { id: string; title: string; description?: string; status?: string };

export async function listMergeRequests(repoId: string): Promise<MergeRequestDto[]> {
  const { data } = await apiClient.get<MergeRequestDto[]>(`/repositories/${repoId}/merge_requests`);
  return data;
}

export async function createMergeRequest(repoId: string, body: { title?: string; description?: string; source?: string; target?: string }): Promise<MergeRequestDto> {
  const { data } = await apiClient.post<MergeRequestDto>(`/repositories/${repoId}/merge_requests`, body as any);
  return data;
}

export async function getMergeRequest(repoId: string, mrId: string): Promise<MergeRequestDto> {
  const { data } = await apiClient.get<MergeRequestDto>(`/repositories/${repoId}/merge_requests/${mrId}`);
  return data;
}

export async function approveMergeRequest(repoId: string, mrId: string): Promise<void> {
  await apiClient.post(`/repositories/${repoId}/merge_requests/${mrId}/approve`, {});
}

export async function unapproveMergeRequest(repoId: string, mrId: string): Promise<void> {
  await apiClient.post(`/repositories/${repoId}/merge_requests/${mrId}/unapprove`, {});
}

export async function mergeMergeRequest(repoId: string, mrId: string): Promise<MergeRequestDto> {
  const { data } = await apiClient.post<MergeRequestDto>(`/repositories/${repoId}/merge_requests/${mrId}/merge`, {});
  return data;
}


