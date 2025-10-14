import { apiClient } from './client';
import type { IdentityProviderConfig } from '../types/corporate-auth';

export async function enableIdentityProvider(
  orgId: string, 
  providerName?: string
): Promise<{ success: boolean; provider_name: string; enabled: boolean }> {
  const { data } = await apiClient.post(
    `/organizations/${orgId}/identity-provider/enable`,
    { provider_name: providerName }
  );
  return data;
}

export async function getIdentityProviderConfig(orgId: string): Promise<Partial<IdentityProviderConfig>> {
  const { data } = await apiClient.get(`/organizations/${orgId}/identity-provider/config`);
  return data;
}

export async function generateApiKeys(orgId: string): Promise<{
  success: boolean;
  api_key: string;
  api_secret: string;
  message: string;
}> {
  const { data } = await apiClient.post(`/organizations/${orgId}/identity-provider/generate-keys`);
  return data;
}

export async function rotateApiSecret(orgId: string): Promise<{
  success: boolean;
  api_secret: string;
  message: string;
}> {
  const { data } = await apiClient.post(`/organizations/${orgId}/identity-provider/rotate-secret`);
  return data;
}

export async function updateIdentityProviderConfig(
  orgId: string, 
  config: Partial<IdentityProviderConfig>
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.put(
    `/organizations/${orgId}/identity-provider/config`,
    config
  );
  return data;
}

