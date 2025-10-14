import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LoadingSpinner } from './loading-spinner';
import { getOrganization } from '../api/organizations';
import type { Organization } from '../types/organization';

export function OrganizationSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orgId) {
      loadOrganization();
    }
  }, [orgId]);

  const loadOrganization = async () => {
    if (!orgId) return;
    try {
      const org = await getOrganization(orgId);
      setOrganization(org);
    } catch (error) {
      console.error('Failed to load organization:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner stages={['Loading Organization Settings']} />;
  }

  if (!organization) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Organization not found</p>
            <Button className="mt-4" onClick={() => navigate('/organizations')}>
              Back to Organizations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/organizations')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Organizations
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{organization.name}</h1>
            <p className="text-muted-foreground">Organization Settings</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <Tabs defaultValue="general" className="w-full">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="invites">Invites</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic information about your organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Name</p>
                    <p className="text-sm text-muted-foreground">{organization.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Slug</p>
                    <p className="text-sm text-muted-foreground">/{organization.slug}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm text-muted-foreground">{organization.description || 'No description'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="members" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Members</CardTitle>
                <CardDescription>Manage organization members</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Member management will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Password and authentication settings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Security settings will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="invites" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Invitation Links</CardTitle>
                <CardDescription>Create and manage invitation links</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Invite management will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

