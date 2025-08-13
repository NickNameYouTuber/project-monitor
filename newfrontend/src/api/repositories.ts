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

export interface PipelineListItem {
  id: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'canceled';
  commit_sha?: string | null;
  ref?: string | null;
  source: 'push' | 'mr';
  created_at?: string | null;
}

export interface PipelineJob {
  id: string;
  name: string;
  stage?: string | null;
  image: string;
  script: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'canceled';
  started_at?: string | null;
  finished_at?: string | null;
  exit_code?: number | null;
}

export interface PipelineDetail {
  id: string;
  repository_id: string;
  commit_sha?: string | null;
  ref?: string | null;
  source: 'push' | 'mr';
  status: 'queued' | 'running' | 'success' | 'failed' | 'canceled';
  created_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  jobs: PipelineJob[];
}

export async function fetchPipelines(repositoryId: string): Promise<PipelineListItem[]> {
  const { data } = await apiClient.get<PipelineListItem[]>(`/repositories/${repositoryId}/pipelines`);
  return data;
}

export async function fetchPipelineDetail(pipelineId: string): Promise<PipelineDetail> {
  const { data } = await apiClient.get<PipelineDetail>(`/pipelines/${pipelineId}`);
  return data;
}

export async function triggerPipeline(repositoryId: string, ref?: string, commit_sha?: string): Promise<PipelineDetail> {
  const { data } = await apiClient.post<PipelineDetail>(`/repositories/${repositoryId}/pipelines/trigger`, { ref, commit_sha, source: 'push' });
  return data;
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

// Merge Requests
export interface MergeRequest {
  id: string;
  repository_id: string;
  author_id: string;
  title: string;
  description?: string;
  source_branch: string;
  target_branch: string;
  status: 'open' | 'merged' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface MergeRequestCreate {
  title: string;
  description?: string;
  source_branch: string;
  target_branch: string;
  reviewer_id?: string | null;
}

export interface MergeRequestComment {
  id: string;
  merge_request_id: string;
  user_id: string;
  content: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export async function listMergeRequests(repositoryId: string) {
  const { data } = await apiClient.get<MergeRequest[]>(`/repositories/${repositoryId}/merge_requests`);
  return data;
}

export async function createMergeRequest(repositoryId: string, payload: MergeRequestCreate) {
  const { data } = await apiClient.post<MergeRequest>(`/repositories/${repositoryId}/merge_requests`, payload);
  return data;
}

export async function updateMergeRequest(repositoryId: string, mrId: string, payload: Partial<Pick<MergeRequest, 'title' | 'description'> & { reviewer_id: string | null }>) {
  const { data } = await apiClient.put<MergeRequest>(`/repositories/${repositoryId}/merge_requests/${mrId}`, payload);
  return data;
}

export async function approveMergeRequest(repositoryId: string, mrId: string) {
  const { data } = await apiClient.post(`/repositories/${repositoryId}/merge_requests/${mrId}/approve`, {});
  return data;
}

export async function mergeMergeRequest(repositoryId: string, mrId: string) {
  const { data } = await apiClient.post<MergeRequest>(`/repositories/${repositoryId}/merge_requests/${mrId}/merge`, {});
  return data;
}

export async function unapproveMergeRequest(repositoryId: string, mrId: string) {
  const { data } = await apiClient.post(`/repositories/${repositoryId}/merge_requests/${mrId}/unapprove`, {});
  return data;
}

export async function closeMergeRequest(repositoryId: string, mrId: string) {
  const { data } = await apiClient.post<MergeRequest>(`/repositories/${repositoryId}/merge_requests/${mrId}/close`, {});
  return data;
}

export async function reopenMergeRequest(repositoryId: string, mrId: string) {
  const { data } = await apiClient.post<MergeRequest>(`/repositories/${repositoryId}/merge_requests/${mrId}/reopen`, {});
  return data;
}

export async function listMergeRequestComments(repositoryId: string, mrId: string) {
  const { data } = await apiClient.get<MergeRequestComment[]>(`/repositories/${repositoryId}/merge_requests/${mrId}/comments`);
  return data;
}

export async function createMergeRequestComment(repositoryId: string, mrId: string, content: string) {
  const { data } = await apiClient.post<MergeRequestComment>(`/repositories/${repositoryId}/merge_requests/${mrId}/comments`, { content });
  return data;
}

export interface MergeRequestApprovalWithUser {
  id: string;
  merge_request_id: string;
  user_id: string;
  user_name?: string;
  created_at: string;
}

export interface MergeRequestDetail extends MergeRequest {
  approvals: MergeRequestApprovalWithUser[];
}

export async function getMergeRequestDetail(repositoryId: string, mrId: string) {
  const { data } = await apiClient.get<MergeRequestDetail>(`/repositories/${repositoryId}/merge_requests/${mrId}`);
  return data;
}

export interface MergeRequestChanges {
  files: GitCommitFileChange[];
}

export async function getMergeRequestChanges(repositoryId: string, mrId: string) {
  const { data } = await apiClient.get<MergeRequestChanges>(`/repositories/${repositoryId}/merge_requests/${mrId}/changes`);
  return data;
}

