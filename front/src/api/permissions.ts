import { apiClient } from './client';
import type { ProjectPermissions, RepositoryPermissions } from '../types/permissions';

export async function checkProjectAccess(projectId: string): Promise<ProjectPermissions> {
  const { data } = await apiClient.get<{
    has_access: boolean;
    role: string | null;
    can_edit_project: boolean;
    can_delete_project: boolean;
    can_manage_members: boolean;
    can_create_tasks: boolean;
    can_edit_tasks: boolean;
  }>(`/projects/${projectId}/members/check-access`);
  
  return {
    hasAccess: data.has_access,
    role: data.role as any,
    canEditProject: data.can_edit_project,
    canDeleteProject: data.can_delete_project,
    canManageMembers: data.can_manage_members,
    canCreateTasks: data.can_create_tasks,
    canEditTasks: data.can_edit_tasks,
  };
}

export async function checkRepositoryAccess(repositoryId: string): Promise<RepositoryPermissions> {
  const { data } = await apiClient.get<{
    has_access: boolean;
    role: string | null;
    can_push: boolean;
    can_merge: boolean;
    can_create_branch: boolean;
    can_delete_branch: boolean;
    can_edit_files: boolean;
    can_manage_settings: boolean;
    can_manage_members: boolean;
    can_delete_repository: boolean;
    can_create_issue: boolean;
  }>(`/repositories/${repositoryId}/check-access`);
  
  return {
    hasAccess: data.has_access,
    role: data.role as any,
    canPush: data.can_push,
    canMerge: data.can_merge,
    canCreateBranch: data.can_create_branch,
    canDeleteBranch: data.can_delete_branch,
    canEditFiles: data.can_edit_files,
    canManageSettings: data.can_manage_settings,
    canManageMembers: data.can_manage_members,
    canDeleteRepository: data.can_delete_repository,
    canCreateIssue: data.can_create_issue,
  };
}

