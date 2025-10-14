import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Link as LinkIcon, Settings, Users, FolderKanban, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { LoadingSpinner } from './loading-spinner';
import { RoleBadge } from './role-badge';
import { toast } from 'sonner';
import { listOrganizations, verifyOrganizationPassword } from '../api/organizations';
import type { Organization } from '../types/organization';
import { initiateSSOLogin } from '../api/sso';

export function OrganizationsPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedOrgForPassword, setSelectedOrgForPassword] = useState<Organization | null>(null);
  const [orgPassword, setOrgPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

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
    if (org.sso_enabled && org.sso_require_sso) {
      handleSSOLogin(org);
      return;
    }
    
    if (org.require_password) {
      setSelectedOrgForPassword(org);
      setPasswordDialogOpen(true);
    } else {
      localStorage.setItem('currentOrgId', org.id);
      navigate('/projects');
    }
  };

  const handleSSOLogin = async (org: Organization) => {
    try {
      const response = await initiateSSOLogin(org.id);
      window.location.href = response.authorization_url;
    } catch (error) {
      toast.error('Failed to initiate SSO login');
    }
  };

  const handleVerifyPassword = async () => {
    if (!selectedOrgForPassword) return;
    
    setVerifying(true);
    try {
      const isValid = await verifyOrganizationPassword(selectedOrgForPassword.id, orgPassword);
      if (isValid) {
        localStorage.setItem('currentOrgId', selectedOrgForPassword.id);
        setPasswordDialogOpen(false);
        setOrgPassword('');
        navigate('/projects');
      } else {
        toast.error('Incorrect password');
      }
    } catch (error) {
      toast.error('Failed to verify password');
    } finally {
      setVerifying(false);
    }
  };

  const handleJoinWithLink = () => {
    const match = inviteLink.match(/\/invite\/([^\/\?]+)/);
    if (match) {
      const token = match[1];
      navigate(`/invite/${token}`);
      setJoinDialogOpen(false);
    } else {
      toast.error('Invalid invitation link');
    }
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
                  {org.current_user_role && (
                    <RoleBadge role={org.current_user_role} type="project" variant="secondary" />
                  )}
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
                  {org.sso_enabled ? (
                    <>
                      <Button 
                        className="flex-1" 
                        onClick={() => handleSSOLogin(org)}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Sign in with SSO
                      </Button>
                      {!org.sso_require_sso && (
                        <Button 
                          variant="outline"
                          onClick={() => handleSelectOrganization(org)}
                        >
                          Regular Login
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button 
                      className="flex-1" 
                      onClick={() => handleSelectOrganization(org)}
                    >
                      Open
                    </Button>
                  )}
                  {(org.current_user_role === 'OWNER' || org.current_user_role === 'ADMIN') && (
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
                  )}
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
          
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <LinkIcon className="w-4 h-4 mr-2" />
                Join with Invite Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join Organization</DialogTitle>
                <DialogDescription>
                  Enter an invitation link to join an organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Invitation Link</Label>
                  <Input
                    value={inviteLink}
                    onChange={(e) => setInviteLink(e.target.value)}
                    placeholder="https://nit.nicorp.tech/invite/abc123..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleJoinWithLink}>
                    Join Organization
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Organization Password Required</DialogTitle>
              <DialogDescription>
                {selectedOrgForPassword?.name} requires a password to access
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={orgPassword}
                  onChange={(e) => setOrgPassword(e.target.value)}
                  placeholder="Enter organization password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleVerifyPassword();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setPasswordDialogOpen(false);
                    setOrgPassword('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleVerifyPassword} disabled={verifying || !orgPassword}>
                  {verifying ? 'Verifying...' : 'Continue'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

