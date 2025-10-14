export type SSOProviderType = 'OIDC' | 'AZURE_AD' | 'GOOGLE' | 'OKTA' | 'KEYCLOAK';

export interface SSOConfiguration {
  id: string;
  organization_id: string;
  provider_type: SSOProviderType;
  enabled: boolean;
  client_id: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  issuer: string;
  jwks_uri?: string;
  email_claim: string;
  name_claim: string;
  sub_claim: string;
  scopes: string;
  require_sso: boolean;
}

export interface SSOConfigurationRequest {
  provider_type: SSOProviderType;
  enabled: boolean;
  client_id: string;
  client_secret?: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  issuer: string;
  jwks_uri?: string;
  email_claim?: string;
  name_claim?: string;
  sub_claim?: string;
  scopes?: string;
  require_sso?: boolean;
}

export interface SSOLoginResponse {
  authorization_url: string;
  state?: string;
}

