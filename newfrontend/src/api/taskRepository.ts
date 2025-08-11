import apiClient from './client';

export interface TaskBranchInfo {
  repository_id: string;
  repository_name: string;
  branch_name: string;
  base_branch?: string | null;
}

export async function getTaskBranches(taskId: string): Promise<TaskBranchInfo[]> {
  const { data } = await apiClient.get<TaskBranchInfo[]>(`/task-repository/${taskId}/branches`);
  return Array.isArray(data) ? data : [];
}

export async function attachBranch(taskId: string, repositoryId: string, branch: string): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>(`/task-repository/${taskId}/attach-branch`, {
    repository_id: repositoryId,
    branch,
  });
  return data;
}


