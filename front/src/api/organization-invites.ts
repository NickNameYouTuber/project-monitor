import { apiClient } from './client';
import type { OrganizationInvite, OrganizationMember } from '../types/organization';

export async function listInvites(orgId: string): Promise<OrganizationInvite[]> {
  const { data } = await apiClient.get<OrganizationInvite[]>(`/organizations/${orgId}/invites`);
  return data;
}

export async function createInvite(orgId: string, request: {
  role: string;
  max_uses?: number;
  expires_at?: string;
  email_domains?: string[];
}): Promise<OrganizationInvite> {
  const { data } = await apiClient.post<OrganizationInvite>(`/organizations/${orgId}/invites`, request);
  return data;
}

export async function getInviteInfo(token: string): Promise<OrganizationInvite> {
  const { data} = await apiClient.get<OrganizationInvite>(`/invites/${token}`);
  return data;
}

export async function acceptInvite(token: string): Promise<OrganizationMember> {
  const { data } = await apiClient.post<OrganizationMember>(`/invites/${token}/accept`);
  return data;
}

export async function revokeInvite(orgId: string, inviteId: string): Promise<void> {
  await apiClient.delete(`/organizations/${orgId}/invites/${inviteId}`);
}

