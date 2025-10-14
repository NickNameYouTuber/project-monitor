export interface CorporateCredential {
  id: string;
  user_id: string;
  organization_id: string;
  corporate_username?: string;
  corporate_email: string;
  is_verified: boolean;
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CorporateAuthStatus {
  linked: boolean;
  email?: string;
  username?: string;
  verified?: boolean;
  last_verified_at?: string;
}

export interface IdentityProviderConfig {
  id: string;
  organization_id: string;
  enabled: boolean;
  provider_name?: string;
  api_key?: string;
  webhook_url?: string;
  allowed_domains?: string;
  require_email_verification: boolean;
  created_at: string;
  updated_at: string;
  has_api_key?: boolean;
}

