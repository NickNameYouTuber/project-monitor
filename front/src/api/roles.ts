import { apiClient } from './client';
import { OrgRole, OrgPermission } from '../types/organization';

export interface CreateRoleRequest {
    name: string;
    color: string;
    permissions: OrgPermission[];
}

export interface UpdateRoleRequest {
    name?: string;
    color?: string;
    permissions: OrgPermission[];
}

export async function getOrganizationRoles(organizationId: string): Promise<OrgRole[]> {
    const { data } = await apiClient.get<OrgRole[]>(`/organizations/${organizationId}/roles`);
    return data;
}

export async function createOrganizationRole(organizationId: string, req: CreateRoleRequest): Promise<OrgRole> {
    const { data } = await apiClient.post<OrgRole>(`/organizations/${organizationId}/roles`, req);
    return data;
}

export async function updateOrganizationRole(organizationId: string, roleId: string, req: UpdateRoleRequest): Promise<OrgRole> {
    const { data } = await apiClient.put<OrgRole>(`/organizations/${organizationId}/roles/${roleId}`, req);
    return data;
}

export async function deleteOrganizationRole(organizationId: string, roleId: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}/roles/${roleId}`);
}

export async function getSystemPermissions(): Promise<OrgPermission[]> {
    const { data } = await apiClient.get<OrgPermission[]>('/permissions');
    return data;
}

export async function getGroupedPermissions(): Promise<Record<string, OrgPermission[]>> {
    const { data } = await apiClient.get<Record<string, OrgPermission[]>>('/permissions/grouped');
    return data;
}
