import React, { useEffect, useState } from 'react';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle, Button,
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
    Input, Label, Box, Flex, Grid, VStack, Text, Badge
} from '@nicorp/nui';
import { Plus, Trash2, Pencil, Shield } from 'lucide-react';
import { PermissionsMatrix } from './permissions-matrix';
import { getOrganizationRoles, createOrganizationRole, updateOrganizationRole, deleteOrganizationRole } from '../../api/roles';
import { OrgRole, OrgPermission } from '../../types/organization';
import { RoleBadge } from '../role-badge';
import { LoadingSpinner } from '../loading-spinner';
import { useNotifications } from '../../hooks/useNotifications';

interface RolesTabProps {
    organizationId: string;
    canManageRoles: boolean;
}

export function RolesTab({ organizationId, canManageRoles }: RolesTabProps) {
    const [roles, setRoles] = useState<OrgRole[]>([]);
    const [loading, setLoading] = useState(true);
    const { showSuccess, showError } = useNotifications();

    // Create/Edit Dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<OrgRole | null>(null);
    const [roleName, setRoleName] = useState('');
    const [roleColor, setRoleColor] = useState('#3b82f6');
    const [rolePermissions, setRolePermissions] = useState<OrgPermission[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadRoles();
    }, [organizationId]);

    const loadRoles = async () => {
        try {
            setLoading(true);
            const data = await getOrganizationRoles(organizationId);
            setRoles(data);
        } catch (error) {
            showError('Failed to load roles');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (role: OrgRole) => {
        setEditingRole(role);
        setRoleName(role.name);
        setRoleColor(role.color);
        setRolePermissions(role.permissions);
        setDialogOpen(true);
    };

    const handleCreateClick = () => {
        setEditingRole(null);
        setRoleName('');
        setRoleColor('#3b82f6');
        setRolePermissions([]);
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!roleName) return;
        setSaving(true);
        try {
            if (editingRole) {
                await updateOrganizationRole(organizationId, editingRole.id, {
                    name: roleName,
                    color: roleColor,
                    permissions: rolePermissions
                });
                showSuccess('Role updated');
            } else {
                await createOrganizationRole(organizationId, {
                    name: roleName,
                    color: roleColor,
                    permissions: rolePermissions
                });
                showSuccess('Role created');
            }
            setDialogOpen(false);
            loadRoles();
        } catch (error) {
            showError('Failed to save role');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (roleId: string) => {
        if (!confirm('Are you sure you want to delete this role? This action cannot be undone.')) return;
        try {
            await deleteOrganizationRole(organizationId, roleId);
            showSuccess('Role deleted');
            loadRoles();
        } catch (error) {
            showError('Failed to delete role');
        }
    };

    if (loading) return <LoadingSpinner stages={['Loading roles...']} />;

    return (
        <VStack className="space-y-6">
            <Card>
                <CardHeader>
                    <Flex className="justify-between items-center">
                        <Box>
                            <CardTitle>Organization Roles</CardTitle>
                            <CardDescription>Define roles and permissions for your members</CardDescription>
                        </Box>
                        {canManageRoles && (
                            <Button onClick={handleCreateClick}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Role
                            </Button>
                        )}
                    </Flex>
                </CardHeader>
                <CardContent>
                    <VStack className="space-y-4">
                        {roles.map(role => (
                            <Flex key={role.id} className="items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                <Flex className="items-center gap-4">
                                    <RoleBadge role={role} />
                                    <Text className="text-sm text-muted-foreground">
                                        {role.permissions.length} permissions
                                    </Text>
                                    {role.systemDefault && (
                                        <Badge variant="secondary" className="text-xs">System Default</Badge>
                                    )}
                                </Flex>
                                {canManageRoles && (
                                    <Flex className="items-center gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(role)}>
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Edit
                                        </Button>
                                        {!role.systemDefault && (
                                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(role.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </Flex>
                                )}
                            </Flex>
                        ))}
                    </VStack>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
                        <DialogDescription>Configure role details and permissions</DialogDescription>
                    </DialogHeader>

                    <VStack className="space-y-6 py-4">
                        <Grid className="grid-cols-2 gap-4">
                            <VStack className="space-y-2">
                                <Label>Role Name</Label>
                                <Input
                                    value={roleName}
                                    onChange={e => setRoleName(e.target.value)}
                                    placeholder="e.g. Project Manager"
                                    disabled={editingRole?.systemDefault}
                                />
                                {editingRole?.systemDefault && <Text className="text-xs text-muted-foreground">System default role names cannot be changed</Text>}
                            </VStack>
                            <VStack className="space-y-2">
                                <Label>Color</Label>
                                <Flex className="gap-2">
                                    <Input
                                        type="color"
                                        value={roleColor}
                                        onChange={e => setRoleColor(e.target.value)}
                                        className="w-12 h-10 p-1"
                                    />
                                    <Input
                                        value={roleColor}
                                        onChange={e => setRoleColor(e.target.value)}
                                        placeholder="#000000"
                                    />
                                </Flex>
                            </VStack>
                        </Grid>

                        <VStack className="space-y-2">
                            <Label>Permissions</Label>
                            <PermissionsMatrix
                                selectedPermissions={rolePermissions}
                                onChange={setRolePermissions}
                                readOnly={!canManageRoles}
                            />
                        </VStack>
                    </VStack>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !roleName}>
                            {saving ? 'Saving...' : 'Save Role'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </VStack>
    );
}
