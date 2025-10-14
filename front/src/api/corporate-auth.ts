import { apiClient } from './client';
import type { CorporateAuthStatus } from '../types/corporate-auth';

export async function linkCorporateAccount(
  orgId: string, 
  email: string, 
  username: string | undefined, 
  password: string
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(
    `/organizations/${orgId}/corporate-auth/link`,
    { email, username, password }
  );
  return data;
}

export async function verifyCorporateCredentials(
  orgId: string, 
  password: string
): Promise<{ valid: boolean; message: string }> {
  const { data } = await apiClient.post(
    `/organizations/${orgId}/corporate-auth/verify`,
    { password }
  );
  return data;
}

export async function updateCorporatePassword(
  orgId: string, 
  currentPassword: string, 
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.put(
    `/organizations/${orgId}/corporate-auth/password`,
    { current_password: currentPassword, new_password: newPassword }
  );
  return data;
}

export async function removeCorporateAccount(orgId: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.delete(`/organizations/${orgId}/corporate-auth`);
  return data;
}

export async function getCorporateAuthStatus(orgId: string): Promise<CorporateAuthStatus> {
  const { data } = await apiClient.get<CorporateAuthStatus>(`/organizations/${orgId}/corporate-auth/status`);
  return data;
}

