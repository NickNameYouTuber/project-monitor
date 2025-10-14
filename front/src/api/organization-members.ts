import { apiClient } from './client';
import type { OrganizationMember } from '../types/organization';

export async function listMembers(orgId: string): Promise<OrganizationMember[]> {
  const { data } = await apiClient.get<OrganizationMember[]>(`/organizations/${orgId}/members`);
  return data;
}

export async function addMember(orgId: string, request: {
  user_id: string;
  role: string;
}): Promise<OrganizationMember> {
  const { data } = await apiClient.post<OrganizationMember>(`/organizations/${orgId}/members`, request);
  return data;
}

export async function removeMember(orgId: string, memberId: string): Promise<void> {
  await apiClient.delete(`/organizations/${orgId}/members/${memberId}`);
}

export async function updateMemberRole(orgId: string, memberId: string, role: string): Promise<OrganizationMember> {
  const { data } = await apiClient.patch<OrganizationMember>(`/organizations/${orgId}/members/${memberId}`, { role });
  return data;
}

export async function getCurrentMember(orgId: string): Promise<OrganizationMember> {
  const { data } = await apiClient.get<OrganizationMember>(`/organizations/${orgId}/members/me`);
  return data;
}


