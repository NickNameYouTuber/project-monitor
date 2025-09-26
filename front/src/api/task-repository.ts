import { apiClient } from './client';

export type TaskBranchInfo = { branch_name: string; created_at: string };

export async function getTaskBranches(taskId: string): Promise<TaskBranchInfo[]> {
  const { data } = await apiClient.get<TaskBranchInfo[]>(`/task-repository/${taskId}/branches`);
  return data;
}

export async function attachBranch(taskId: string, branch: string): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>(`/task-repository/${taskId}/attach-branch`, { branch });
  return data;
}


