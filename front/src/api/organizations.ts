import { apiClient } from './client';
import type { Organization } from '../types/organization';

export async function listOrganizations(): Promise<Organization[]> {
  const { data } = await apiClient.get<Organization[]>('/organizations');
  return data;
}

export async function getOrganization(id: string): Promise<Organization> {
  const { data } = await apiClient.get<Organization>(`/organizations/${id}`);
  return data;
}

export async function createOrganization(request: {
  name: string;
  slug?: string;
  description?: string;
  logo_url?: string;
  website?: string;
  require_password?: boolean;
  password?: string;
  corporate_domain?: string;
  require_corporate_email?: boolean;
}): Promise<Organization> {
  const { data } = await apiClient.post<Organization>('/organizations', request);
  return data;
}

export async function deleteOrganization(id: string): Promise<void> {
  await apiClient.delete(`/organizations/${id}`);
}

export async function verifyOrganizationPassword(id: string, password: string): Promise<boolean> {
  const { data } = await apiClient.post<{ valid: boolean }>(`/organizations/${id}/verify-password`, { password });
  return data.valid;
}

