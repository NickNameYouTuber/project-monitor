import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Users, Shield, Link as LinkIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { LoadingSpinner } from './loading-spinner';
import { getOrganization } from '../api/organizations';
import type { Organization } from '../types/organization';

export function OrganizationSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    
    (async () => {
      try {
        const org = await getOrganization(orgId);
        setOrganization(org);
      } catch (error) {
        console.error('Failed to load organization:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  if (loading) {
    return <LoadingSpinner stages={['Load Organization', 'Ready']} />;
  }

  if (!organization) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Organization not found</h2>
          <Button onClick={() => navigate('/organizations')}>Back to Organizations</Button>
        </div>
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
            <h1 className="text-2xl font-semibold">{organization.name} Settings</h1>
            <p className="text-muted-foreground">Manage organization settings and members</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <Tabs defaultValue="general" className="h-full">
          <TabsList className="mb-6">
            <TabsTrigger value="general">
              <Building2 className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              Members
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="invitations">
              <LinkIcon className="w-4 h-4 mr-2" />
              Invitations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>General Information</CardTitle>
                <CardDescription>Basic details about your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Organization Name</Label>
                  <Input value={organization.name} disabled />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={organization.slug} disabled />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={organization.description || ''} disabled rows={3} />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={organization.website || ''} disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organization Members</CardTitle>
                <CardDescription>Manage who has access to this organization</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Members management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Configure security options for your organization</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Security settings coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invitation Links</CardTitle>
                <CardDescription>Create and manage invitation links</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Invitation management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

