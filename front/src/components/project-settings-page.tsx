import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Settings, Users, Shield, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { LoadingSpinner } from './loading-spinner';
import { Alert, AlertDescription } from './ui/alert';
import { useProjectPermissions } from '../hooks/useProjectPermissions';
import { RoleBadge } from './role-badge';
import { MembersTab } from './project-settings/members-tab';
import type { Project } from '../App';

interface ProjectSettingsPageProps {
  project: Project | null;
}

export function ProjectSettingsPage({ project }: ProjectSettingsPageProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const permissions = useProjectPermissions(projectId);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No project selected</p>
      </div>
    );
  }

  if (permissions.loading) {
    return <LoadingSpinner stages={['Check Access', 'Load Settings', 'Ready']} />;
  }

  if (!permissions.hasAccess) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You don't have access to this project's settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Project Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure {project.title} settings and manage team members
            </p>
          </div>
          {permissions.role && (
            <RoleBadge role={permissions.role} type="project" />
          )}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <Tabs defaultValue="general" className="h-full">
          <TabsList>
            <TabsTrigger value="general">
              <Settings className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            {permissions.canManageMembers && (
              <TabsTrigger value="members">
                <Users className="w-4 h-4 mr-2" />
                Members
              </TabsTrigger>
            )}
            <TabsTrigger value="permissions">
              <Shield className="w-4 h-4 mr-2" />
              Permissions
            </TabsTrigger>
            {permissions.canDeleteProject && (
              <TabsTrigger value="advanced">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Advanced
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <GeneralTab project={project} permissions={permissions} />
          </TabsContent>

          {permissions.canManageMembers && (
            <TabsContent value="members" className="space-y-4">
              <MembersTab projectId={project.id} permissions={permissions} />
            </TabsContent>
          )}

          <TabsContent value="permissions" className="space-y-4">
            <PermissionsTab />
          </TabsContent>

          {permissions.canDeleteProject && (
            <TabsContent value="advanced" className="space-y-4">
              <AdvancedTab project={project} permissions={permissions} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

function GeneralTab({ project, permissions }: { project: Project; permissions: any }) {
  const [settings, setSettings] = useState({
    name: project.title,
    description: project.description,
    color: project.color || '#3b82f6',
    status: project.status,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>General Settings</CardTitle>
          {permissions.role && <RoleBadge role={permissions.role} type="project" variant="secondary" />}
        </div>
        <CardDescription>Basic project information and configuration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!permissions.canEditProject && (
          <Alert>
            <AlertDescription>
              You don't have permission to edit project settings. Contact a project owner or admin.
            </AlertDescription>
          </Alert>
        )}
        <div>
          <label className="text-sm font-medium">Project Name</label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
            disabled={!permissions.canEditProject}
            className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            value={settings.description}
            onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
            disabled={!permissions.canEditProject}
            rows={3}
            className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md disabled:opacity-50"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Color</label>
            <input
              type="color"
              value={settings.color}
              onChange={(e) => setSettings(prev => ({ ...prev, color: e.target.value }))}
              disabled={!permissions.canEditProject}
              className="w-full mt-1 h-10 rounded-md disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              value={settings.status}
              onChange={(e) => setSettings(prev => ({ ...prev, status: e.target.value }))}
              disabled={!permissions.canEditProject}
              className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md disabled:opacity-50"
            >
              <option value="inPlans">In Plans</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function PermissionsTab() {
  const permissionsMatrix = [
    { action: 'View Project', owner: true, admin: true, developer: true, viewer: true },
    { action: 'Edit Project', owner: true, admin: true, developer: false, viewer: false },
    { action: 'Delete Project', owner: true, admin: false, developer: false, viewer: false },
    { action: 'Manage Members', owner: true, admin: true, developer: false, viewer: false },
    { action: 'Create Tasks', owner: true, admin: true, developer: true, viewer: false },
    { action: 'Edit Tasks', owner: true, admin: true, developer: true, viewer: false },
    { action: 'Delete Tasks', owner: true, admin: true, developer: true, viewer: false },
    { action: 'Comment', owner: true, admin: true, developer: true, viewer: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Permissions</CardTitle>
        <CardDescription>Overview of what each role can do in this project</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Action</th>
                <th className="text-center py-3 px-4">Owner</th>
                <th className="text-center py-3 px-4">Admin</th>
                <th className="text-center py-3 px-4">Developer</th>
                <th className="text-center py-3 px-4">Viewer</th>
              </tr>
            </thead>
            <tbody>
              {permissionsMatrix.map((perm, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-3 px-4">{perm.action}</td>
                  <td className="text-center py-3 px-4">
                    {perm.owner ? <span className="text-green-500">✓</span> : <span className="text-muted-foreground">✗</span>}
                  </td>
                  <td className="text-center py-3 px-4">
                    {perm.admin ? <span className="text-green-500">✓</span> : <span className="text-muted-foreground">✗</span>}
                  </td>
                  <td className="text-center py-3 px-4">
                    {perm.developer ? <span className="text-green-500">✓</span> : <span className="text-muted-foreground">✗</span>}
                  </td>
                  <td className="text-center py-3 px-4">
                    {perm.viewer ? <span className="text-green-500">✓</span> : <span className="text-muted-foreground">✗</span>}
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

function AdvancedTab({ project, permissions }: { project: Project; permissions: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-destructive rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-destructive">Delete Project</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Once you delete a project, there is no going back. This will delete all tasks, repositories, and data.
                </p>
              </div>
              <button
                disabled={!permissions.canDeleteProject}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
              >
                Delete Project
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

