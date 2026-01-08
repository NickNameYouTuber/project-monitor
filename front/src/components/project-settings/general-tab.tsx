import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Project } from '../../App';

interface GeneralTabProps {
    project: Project;
}

export function GeneralTab({ project }: GeneralTabProps) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                    <CardDescription>Manage your project's core information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Project Name</Label>
                        <Input id="title" defaultValue={project.title} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" defaultValue={project.description} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Status</Label>
                            <Select defaultValue={project.status || 'active'}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Color</Label>
                            <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full ${project.color || 'bg-blue-500'}`} />
                                <Input defaultValue={project.color || 'bg-blue-500'} className="font-mono text-xs" />
                            </div>
                        </div>
                    </div>
                </CardContent>
                <div className="px-6 py-4 border-t flex justify-end">
                    <Button>Save Changes</Button>
                </div>
            </Card>
        </div>
    );
}
