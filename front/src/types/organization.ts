// Permissions
export enum OrgPermission {
  // Views
  VIEW_SETTINGS_TAB = 'VIEW_SETTINGS_TAB',
  VIEW_MEMBERS_TAB = 'VIEW_MEMBERS_TAB',
  VIEW_BILLING_TAB = 'VIEW_BILLING_TAB',
  VIEW_PROJECTS_TAB = 'VIEW_PROJECTS_TAB',

  // Actions
  MANAGE_ORG_DETAILS = 'MANAGE_ORG_DETAILS',
  MANAGE_ROLES = 'MANAGE_ROLES',
  MANAGE_MEMBERS = 'MANAGE_MEMBERS',
  MANAGE_BILLING = 'MANAGE_BILLING',
  CREATE_PROJECT = 'CREATE_PROJECT',
  DELETE_PROJECT = 'DELETE_PROJECT'
}

export interface OrgRole {
  id: string;
  name: string;
  color: string;
  permissions: OrgPermission[];
  systemDefault: boolean;
}

// Backward compatibility alias, though we should prefer string | OrgRole
export type OrganizationRole = string;

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  require_password?: boolean;
  corporate_domain?: string;
  require_corporate_email?: boolean;
  default_project_role?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  project_count?: number;
  current_user_role?: OrganizationRole | OrgRole; // Can be detailed object now
  sso_enabled?: boolean;
  sso_require_sso?: boolean;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole | OrgRole; // Can be string (legacy/simple) or full object
  role_details?: OrgRole; // Full role details if available
  corporate_email?: string;
  corporate_email_verified?: boolean;
  joined_at: string;
  last_active_at?: string;
  user?: {
    id: string;
    username: string;
    display_name?: string;
  };
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  organization_name: string;
  token: string;
  role: OrganizationRole | OrgRole;
  max_uses?: number;
  current_uses: number;
  expires_at?: string;
  email_domains?: string[];
  created_by: string;
  created_at: string;
  revoked: boolean;
  is_valid: boolean;
}

