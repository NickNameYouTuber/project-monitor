import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RoleBadge } from '../role-badge';
import { useNotifications } from '../../hooks/useNotifications';
// import { updateProject } from '../../api/projects'; // Dynamic import used in parent, or we can use prop
import type { Project } from '../../App';
import { Save, AlertTriangle } from 'lucide-react';

interface GeneralTabProps {
    project: Project;
    permissions: any;
    onUpdate: (updatedProject: Project) => void;
}

export function GeneralTab({ project, permissions, onUpdate }: GeneralTabProps) {
    const { showSuccess, showError } = useNotifications();
    const [formData, setFormData] = useState({
        name: project.title,
        description: project.description,
        color: project.color || '#6366f1',
        status: project.status,
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Dynamic import to avoid circular dependencies if any
            const { updateProject } = await import('../../api/projects');

            const updated = await updateProject(project.id, {
                name: formData.name,
                description: formData.description,
                color: formData.color,
                status: formData.status,
            });

            onUpdate({ ...project, title: updated.name, description: updated.description || '', status: updated.status, color: updated.color || '#6366f1' });
            showSuccess('Project settings saved successfully');
        } catch (error) {
            console.error('Failed to update project:', error);
            showError('Failed to save project settings');
        } finally {
            setIsSaving(false);
        }
    };

    const hasChanges =
        formData.name !== project.title ||
        formData.description !== project.description ||
        formData.color !== project.color ||
        formData.status !== project.status;

    return (
        <div className="grid gap-6">
            <Card className="border-border/50 shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle>Project Identity</CardTitle>
                            <CardDescription>Configure the basic information for this project.</CardDescription>
                        </div>
                        {permissions.role && <RoleBadge role={permissions.role} type="project" variant="secondary" />}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!permissions.canEditProject && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-4 flex items-center gap-3 text-sm text-yellow-600 dark:text-yellow-500 mb-4">
                            <AlertTriangle className="w-4 h-4" />
                            You do not have permission to edit these settings.
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Project Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                disabled={!permissions.canEditProject || isSaving}
                                placeholder="My Awesome Project"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                                disabled={!permissions.canEditProject || isSaving}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="inPlans">In Plans</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            disabled={!permissions.canEditProject || isSaving}
                            placeholder="Describe the goals and scope of this project..."
                            className="min-h-[100px] resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="color">Theme Color</Label>
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-lg border border-border shadow-sm"
                                style={{ backgroundColor: formData.color }}
                            />
                            <Input
                                id="color"
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                disabled={!permissions.canEditProject || isSaving}
                                className="w-24 h-10 p-1 cursor-pointer"
                            />
                            <p className="text-sm text-muted-foreground">
                                Selected color will be used for project badges and identifiers.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleSave}
                            disabled={!permissions.canEditProject || !hasChanges || isSaving}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
