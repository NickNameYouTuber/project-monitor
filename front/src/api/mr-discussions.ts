import { apiClient } from './client';

export type MRDiscussionDto = {
  id: string;
  filePath?: string;
  lineNumber?: number;
  resolved?: boolean;
  createdAt?: string;
};

export type MRNoteDto = { id: string; content: string; author?: any; createdAt?: string };

export async function listDiscussions(repoId: string, mrId: string): Promise<MRDiscussionDto[]> {
  const { data } = await apiClient.get<MRDiscussionDto[]>(`/repositories/${repoId}/merge_requests/${mrId}/discussions`);
  return data;
}

export async function createDiscussion(repoId: string, mrId: string, body: { file_path?: string; line_number?: number }): Promise<MRDiscussionDto> {
  const { data } = await apiClient.post<MRDiscussionDto>(`/repositories/${repoId}/merge_requests/${mrId}/discussions`, body);
  return data;
}

export async function addDiscussionNote(repoId: string, mrId: string, discussionId: string, body: { content: string }): Promise<MRNoteDto> {
  const { data } = await apiClient.post<MRNoteDto>(`/repositories/${repoId}/merge_requests/${mrId}/discussions/${discussionId}/notes`, body);
  return data;
}

export async function resolveDiscussion(repoId: string, mrId: string, discussionId: string): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>(`/repositories/${repoId}/merge_requests/${mrId}/discussions/${discussionId}/resolve`, {});
  return data;
}


