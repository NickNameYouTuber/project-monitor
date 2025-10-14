import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Link as LinkIcon, Settings, Users, FolderKanban } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LoadingSpinner } from './loading-spinner';
import { RoleBadge } from './role-badge';
import { listOrganizations } from '../api/organizations';
import type { Organization } from '../types/organization';

export function OrganizationsPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const orgs = await listOrganizations();
      setOrganizations(orgs);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrganization = (org: Organization) => {
    localStorage.setItem('currentOrgId', org.id);
    navigate('/projects');
  };

  if (loading) {
    return <LoadingSpinner stages={['Load Organizations', 'Ready']} />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6">
        <div>
          <h1 className="text-2xl font-semibold">Your Organizations</h1>
          <p className="text-muted-foreground mt-1">
            Select an organization to view projects and collaborate with your team
          </p>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {organizations.map(org => (
            <Card key={org.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {org.logo_url ? (
                      <img src={org.logo_url} alt={org.name} className="w-12 h-12 rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <Building2 className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">/{org.slug}</p>
                    </div>
                  </div>
                  <RoleBadge role="OWNER" type="project" variant="secondary" />
                </div>
                <CardDescription className="mt-2">
                  {org.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <FolderKanban className="w-4 h-4" />
                    <span>{org.project_count || 0} projects</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{org.member_count || 0} members</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={() => handleSelectOrganization(org)}
                  >
                    Open
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/organizations/${org.id}/settings`);
                    }}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-4">
          <Button onClick={() => navigate('/organizations/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Organization
          </Button>
          <Button variant="outline">
            <LinkIcon className="w-4 h-4 mr-2" />
            Join with Invite Link
          </Button>
        </div>
      </div>
    </div>
  );
}

