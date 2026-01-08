import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Check, X } from 'lucide-react';

export function PermissionsTab() {
    const permissionsMatrix = [
        { action: 'View Project', owner: true, admin: true, developer: true, viewer: true },
        { action: 'Edit Project Settings', owner: true, admin: true, developer: false, viewer: false },
        { action: 'Manage Members', owner: true, admin: true, developer: false, viewer: false },
        { action: 'Delete Project', owner: true, admin: false, developer: false, viewer: false },
        { action: 'Create Tasks', owner: true, admin: true, developer: true, viewer: false },
        { action: 'Edit Tasks', owner: true, admin: true, developer: true, viewer: false },
        { action: 'Delete Tasks', owner: true, admin: true, developer: true, viewer: false },
        { action: 'Comment on Tasks', owner: true, admin: true, developer: true, viewer: true },
        { action: 'Manage Repositories', owner: true, admin: true, developer: true, viewer: false },
    ];

    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Overview of access levels and capabilities for each project role.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-border/50 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border/50">
                                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Permission</th>
                                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Owner</th>
                                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Admin</th>
                                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Developer</th>
                                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Viewer</th>
                            </tr>
                        </thead>
                        <tbody>
                            {permissionsMatrix.map((perm, idx) => (
                                <tr key={idx} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                                    <td className="py-3 px-4 font-medium">{perm.action}</td>
                                    <td className="text-center py-3 px-4">
                                        {perm.owner ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                                    </td>
                                    <td className="text-center py-3 px-4">
                                        {perm.admin ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                                    </td>
                                    <td className="text-center py-3 px-4">
                                        {perm.developer ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                                    </td>
                                    <td className="text-center py-3 px-4">
                                        {perm.viewer ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
