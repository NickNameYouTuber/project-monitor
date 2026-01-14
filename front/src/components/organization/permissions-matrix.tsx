import React, { useEffect, useState } from 'react';
import { Checkbox, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@nicorp/nui';
import { OrgPermission } from '../../types/organization';
import { getGroupedPermissions } from '../../api/roles';
import { LoadingSpinner } from '../loading-spinner';

interface PermissionsMatrixProps {
    selectedPermissions: OrgPermission[];
    onChange: (permissions: OrgPermission[]) => void;
    readOnly?: boolean;
}

export function PermissionsMatrix({ selectedPermissions, onChange, readOnly = false }: PermissionsMatrixProps) {
    const [groupedPermissions, setGroupedPermissions] = useState<Record<string, OrgPermission[]> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await getGroupedPermissions();
                setGroupedPermissions(data);
            } catch (error) {
                console.error('Failed to load permissions', error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return <LoadingSpinner stages={['Loading permissions...']} />;
    }

    if (!groupedPermissions) {
        return <div className="text-red-500">Failed to load permissions.</div>;
    }

    const handleToggle = (permission: OrgPermission) => {
        if (readOnly) return;

        if (selectedPermissions.includes(permission)) {
            onChange(selectedPermissions.filter(p => p !== permission));
        } else {
            onChange([...selectedPermissions, permission]);
        }
    };

    const handleToggleGroup = (group: string, permissions: OrgPermission[]) => {
        if (readOnly) return;

        const allSelected = permissions.every(p => selectedPermissions.includes(p));

        if (allSelected) {
            // Unselect all in group
            onChange(selectedPermissions.filter(p => !permissions.includes(p)));
        } else {
            // Select all in group
            const newSelected = [...selectedPermissions];
            permissions.forEach(p => {
                if (!newSelected.includes(p)) {
                    newSelected.push(p);
                }
            });
            onChange(newSelected);
        }
    };

    return (
        <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([group, permissions]) => {
                const allSelected = permissions.every(p => selectedPermissions.includes(p));
                const someSelected = permissions.some(p => selectedPermissions.includes(p));

                return (
                    <Card key={group}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`group-${group}`}
                                    checked={allSelected ? true : (someSelected ? 'indeterminate' : false)}
                                    onCheckedChange={() => handleToggleGroup(group, permissions)}
                                    disabled={readOnly}
                                />
                                <CardTitle className="text-base">{group}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {permissions.map((perm) => (
                                    <div key={perm} className="flex items-start space-x-2">
                                        <Checkbox
                                            id={perm}
                                            checked={selectedPermissions.includes(perm)}
                                            onCheckedChange={() => handleToggle(perm)}
                                            disabled={readOnly}
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label
                                                htmlFor={perm}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {/* We display raw enum for now, ideally we map to readable string if API doesn't provide it */}
                                                {formatPermissionName(perm)}
                                            </Label>
                                            {/* Description could be added here if we had it in API response map */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

function formatPermissionName(perm: string): string {
    return perm
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}
