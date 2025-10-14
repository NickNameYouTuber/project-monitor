export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';

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
  role?: OrganizationRole;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
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
  role: OrganizationRole;
  max_uses?: number;
  current_uses: number;
  expires_at?: string;
  email_domains?: string[];
  created_by: string;
  created_at: string;
  revoked: boolean;
  is_valid: boolean;
}

