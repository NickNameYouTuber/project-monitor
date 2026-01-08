import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Check, X } from 'lucide-react';

export function PermissionsTab() {
    const roles = ['Owner', 'Admin', 'Developer', 'Viewer'];
    const permissions = [
        { name: 'View Project', values: [true, true, true, true] },
        { name: 'Edit Code', values: [true, true, true, false] },
        { name: 'Manage Tasks', values: [true, true, true, false] },
        { name: 'Manage Members', values: [true, true, false, false] },
        { name: 'Delete Project', values: [true, false, false, false] },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Overview of what each role can do in this project.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Permission</TableHead>
                            {roles.map(role => (
                                <TableHead key={role} className="text-center">{role}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {permissions.map((perm) => (
                            <TableRow key={perm.name}>
                                <TableCell className="font-medium">{perm.name}</TableCell>
                                {perm.values.map((hasPerm, i) => (
                                    <TableCell key={i} className="text-center">
                                        {hasPerm ? (
                                            <Check className="w-4 h-4 text-green-500 mx-auto" />
                                        ) : (
                                            <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
