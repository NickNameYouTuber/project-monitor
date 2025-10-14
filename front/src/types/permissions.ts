export type ProjectRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';
export type RepositoryRole = 'OWNER' | 'MAINTAINER' | 'DEVELOPER' | 'REPORTER' | 'VIEWER';

export interface ProjectPermissions {
  hasAccess: boolean;
  role: ProjectRole | null;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canManageMembers: boolean;
  canCreateTasks: boolean;
  canEditTasks: boolean;
}

export interface RepositoryPermissions {
  hasAccess: boolean;
  role: RepositoryRole | null;
  canPush: boolean;
  canMerge: boolean;
  canCreateBranch: boolean;
  canDeleteBranch: boolean;
  canEditFiles: boolean;
  canManageSettings: boolean;
  canManageMembers: boolean;
  canDeleteRepository: boolean;
  canCreateIssue: boolean;
}

