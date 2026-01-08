import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, Trash2 } from 'lucide-react';
// import { deleteProject } from '../../api/projects'; // Dynamic import
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import type { Project } from '../../App';
import { useCurrentOrganization } from '../../hooks/useAppContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";

interface AdvancedTabProps {
    project: Project;
    permissions: any;
}

export function AdvancedTab({ project, permissions }: AdvancedTabProps) {
    const navigate = useNavigate();
    const { organizationId } = useCurrentOrganization();
    const { showError, showSuccess } = useNotifications();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteProject = async () => {
        if (!permissions.canDeleteProject) return;

        setIsDeleting(true);
        try {
            const { deleteProject } = await import('../../api/projects');
            await deleteProject(project.id);
            showSuccess(`Project "${project.title}" deleted successfully`);
            setIsDeleteOpen(false);
            navigate(`/${organizationId}/projects`);
        } catch (error) {
            console.error('Failed to delete project:', error);
            showError('Failed to delete project');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-destructive/30 shadow-sm overflow-hidden">
                <CardHeader className="bg-destructive/5 border-b border-destructive/10">
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        <CardTitle>Danger Zone</CardTitle>
                    </div>
                    <CardDescription>
                        Irreversible actions that affect the entire project.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-card bg-destructive/5 md:flex-row flex-col gap-4">
                        <div className="space-y-1">
                            <h4 className="font-medium">Delete Project</h4>
                            <p className="text-sm text-muted-foreground max-w-xl">
                                Once you delete a project, there is no going back. This will permanently remove all tasks, documents, and data associated with this project.
                            </p>
                        </div>
                        <Button
                            variant="destructive"
                            onClick={() => setIsDeleteOpen(true)}
                            disabled={!permissions.canDeleteProject}
                            className="shrink-0"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Project
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the project
                            <span className="font-semibold text-foreground"> {project.title} </span>
                            and all of its data.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteProject} disabled={isDeleting}>
                            {isDeleting ? "Deleting..." : "Delete Project"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
