import { apiClient } from './client';

export type CommentDto = {
  id: string;
  content: string;
  taskId: string;
  userId?: string;
  username?: string;
  is_system?: boolean;
  system?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export async function listComments(taskId: string): Promise<CommentDto[]> {
  const { data } = await apiClient.get<CommentDto[]>(`/tasks/${taskId}/comments`);
  return data;
}

export async function createComment(body: { task_id: string; content: string }): Promise<CommentDto> {
  const { data } = await apiClient.post<CommentDto>('/comments', body);
  return data;
}


