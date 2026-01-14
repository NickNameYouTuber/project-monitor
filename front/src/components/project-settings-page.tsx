import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Settings, Users, Shield, AlertTriangle, Folder, ChevronRight, LayoutGrid } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger, Card, CardContent, CardHeader, CardTitle } from '@nicorp/nui';
import { LoadingSpinner } from './loading-spinner';
import { useProjectPermissions } from '../hooks/useProjectPermissions';
import { RoleBadge } from './role-badge';
import { MembersTab } from './project-settings/members-tab';
import { GeneralTab } from './project-settings/general-tab';
import { PermissionsTab } from './project-settings/permissions-tab';
import { AdvancedTab } from './project-settings/advanced-tab';
import type { Project } from '../App';
import { useCurrentOrganization } from '../hooks/useAppContext';

interface ProjectSettingsPageProps {
  project: Project | null;
  onUpdateProject?: (project: Project) => void;
}

export function ProjectSettingsPage({ project, onUpdateProject }: ProjectSettingsPageProps) {
  const { projectId } = useParams<{ projectId: string }>();
  // Use project ID from props if available, otherwise from URL
  const targetProjectId = project?.id || projectId;
  const permissions = useProjectPermissions(targetProjectId);
  const { organization: currentOrganization } = useCurrentOrganization();
  const [activeTab, setActiveTab] = useState('general');

  // Local state to handle immediate UI updates before parent refresh
  const [localProject, setLocalProject] = useState<Project | null>(project);

  // Sync local project when prop changes
  React.useEffect(() => {
    setLocalProject(project);
  }, [project]);

  const handleProjectUpdate = (updated: Project) => {
    setLocalProject(updated);
    if (onUpdateProject) {
      onUpdateProject(updated);
    }
  };

  if (!localProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Folder className="w-8 h-8 opacity-50" />
          <p>No project selected</p>
        </div>
      </div>
    );
  }

  if (permissions.loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background/50 backdrop-blur-sm">
        <LoadingSpinner stages={['Checking Access', 'Loading Settings', 'Verifying Permissions']} />
      </div>
    );
  }

  if (!permissions.hasAccess) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Card className="max-w-md border-destructive/20 shadow-lg">
          <CardHeader className="bg-destructive/5 border-b border-destructive/10">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              You do not have permission to view the settings for this project.
            </p>
            <div className="mt-4 flex justify-center">
              <Link to={currentOrganization ? `/${currentOrganization.id}/projects` : '/organizations'}>
                <div className="text-sm text-primary hover:underline">Return to Projects</div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background/50">
      {/* Premium Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-5xl mx-auto py-6 px-4 md:px-6">

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to={`/${currentOrganization?.id || ''}/projects`} className="hover:text-foreground transition-colors flex items-center gap-1">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Projects</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            <span className="text-foreground font-medium truncate max-w-[150px]">{localProject.title}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            <span>Settings</span>
          </div>

          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 rounded-2xl flex items-center justify-center border border-indigo-500/10 shadow-sm shrink-0">
              <div style={{ color: localProject.color || '#6366f1' }}>
                <Folder className="w-8 h-8" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{localProject.title}</h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <span>Project Settings</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="font-mono text-xs opacity-70">ID: {localProject.id.substring(0, 8)}</span>
                </div>
                {permissions.role && (
                  <RoleBadge role={permissions.role} type="project" variant="secondary" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="container max-w-5xl mx-auto py-8 px-4 md:px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-2 -my-2">
              <TabsList className="h-10 bg-muted/50 p-1 border border-border/50">
                <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all focus-visible:ring-0">
                  <Settings className="w-4 h-4 mr-2 opacity-70" />
                  General
                </TabsTrigger>
                {permissions.canManageMembers && (
                  <TabsTrigger value="members" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all focus-visible:ring-0">
                    <Users className="w-4 h-4 mr-2 opacity-70" />
                    Members
                  </TabsTrigger>
                )}
                <TabsTrigger value="permissions" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all focus-visible:ring-0">
                  <Shield className="w-4 h-4 mr-2 opacity-70" />
                  Permissions
                </TabsTrigger>
                {permissions.canDeleteProject && (
                  <TabsTrigger value="advanced" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all focus-visible:ring-0">
                    <AlertTriangle className="w-4 h-4 mr-2 opacity-70" />
                    Advanced
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="general" className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
              <GeneralTab project={localProject} permissions={permissions} onUpdate={handleProjectUpdate} />
            </TabsContent>

            {permissions.canManageMembers && (
              <TabsContent value="members" className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
                <MembersTab projectId={localProject.id} permissions={permissions} />
              </TabsContent>
            )}

            <TabsContent value="permissions" className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
              <PermissionsTab />
            </TabsContent>

            {permissions.canDeleteProject && (
              <TabsContent value="advanced" className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
                <AdvancedTab project={localProject} permissions={permissions} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
