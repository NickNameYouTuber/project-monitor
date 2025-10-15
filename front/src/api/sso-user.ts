import { apiClient } from './client';

export interface SSOUserInfo {
  sso_email: string;
  sso_provider_id: string;
  linked_at: string;
  last_login_at: string;
}

export async function getCurrentSSOInfo(orgId: string): Promise<SSOUserInfo | null> {
  try {
    const { data } = await apiClient.get<SSOUserInfo>(`/sso/organizations/${orgId}/current-user`);
    return data;
  } catch (error) {
    return null;
  }
}

