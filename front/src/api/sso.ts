import { apiClient } from './client';
import type { SSOConfiguration, SSOConfigurationRequest, SSOLoginResponse } from '../types/sso';

export async function getSSOConfig(orgId: string): Promise<SSOConfiguration | null> {
  try {
    const { data } = await apiClient.get<SSOConfiguration>(`/sso/organizations/${orgId}/config`);
    return data;
  } catch (error) {
    return null;
  }
}

export async function saveSSOConfig(orgId: string, config: SSOConfigurationRequest): Promise<SSOConfiguration> {
  const { data } = await apiClient.post<SSOConfiguration>(`/sso/organizations/${orgId}/config`, config);
  return data;
}

export async function initiateSSOLogin(orgId: string): Promise<SSOLoginResponse> {
  const { data } = await apiClient.get<SSOLoginResponse>(`/sso/organizations/${orgId}/login`);
  return data;
}

export async function handleSSOCallback(code: string, state: string): Promise<{ user_id: string; organization_id: string }> {
  const { data } = await apiClient.get(`/sso/callback`, {
    params: { code, state }
  });
  return data;
}

