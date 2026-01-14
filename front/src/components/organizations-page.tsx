import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Link as LinkIcon, Settings, Users, FolderKanban, Shield } from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Badge, Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger, Input, Label, Box, Flex, VStack, Grid, Heading, Text
} from '@nicorp/nui';
import { LoadingSpinner } from './loading-spinner';
import { RoleBadge } from './role-badge';
import { listOrganizations } from '../api/organizations';
import type { Organization } from '../types/organization';
import { initiateSSOLogin } from '../api/sso';
import { setAccessToken, getAccessToken } from '../api/client';
import { useAppContext } from '../hooks/useAppContext';
import { useNotifications } from '../hooks/useNotifications';

export function OrganizationsPage() {
  const navigate = useNavigate();
  const { setCurrentOrganization } = useAppContext();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedOrgForPassword, setSelectedOrgForPassword] = useState<Organization | null>(null);
  const [orgPassword, setOrgPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const { showError } = useNotifications();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      showError('Please login first');
      navigate('/auth');
      return;
    }
    loadOrganizations();
  }, [navigate, showError]);

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
      sessionStorage.setItem(`org_verified_${org.id}`, 'true');
      setCurrentOrganization(org);
    }
  };

  const handleSSOLogin = async (org: Organization) => {
    const token = getAccessToken();
    if (!token) {
      showError('Please login first to use SSO');
      navigate('/auth');
      return;
    }

    try {
      const response = await initiateSSOLogin(org.id);
      window.location.href = response.authorization_url;
    } catch (error) {
      console.error('SSO login error:', error);
      showError('Failed to initiate SSO login');
    }
  };

  const handleVerifyPassword = async () => {
    if (!selectedOrgForPassword) return;

    setVerifying(true);
    try {
      const response = await fetch(`/api/organizations/${selectedOrgForPassword.id}/verify-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: orgPassword })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          setAccessToken(data.token);
          sessionStorage.setItem(`org_verified_${selectedOrgForPassword.id}`, 'true');
          setPasswordDialogOpen(false);
          setOrgPassword('');
          setCurrentOrganization(selectedOrgForPassword);
        }
      } else {
        showError('Incorrect password');
      }
    } catch (error) {
      showError('Failed to verify password');
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
      showError('Invalid invitation link');
    }
  };

  if (loading) {
    return <LoadingSpinner stages={['Load Organizations', 'Ready']} />;
  }

  return (
    <Flex className="h-full flex-col">
      <Box className="border-b border-border p-6">
        <Box>
          <Heading level={2} className="text-2xl">Your Organizations</Heading>
          <Text variant="muted" className="mt-1">
            Select an organization to view projects and collaborate with your team
          </Text>
        </Box>
      </Box>

      <Box className="flex-1 p-6 overflow-auto">
        <Grid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {organizations.map(org => (
            <Card key={org.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Flex className="items-start justify-between">
                  <Flex className="items-center gap-3">
                    {org.logo_url ? (
                      <img src={org.logo_url} alt={org.name} className="w-12 h-12 rounded" />
                    ) : (
                      <Box className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <Building2 className="w-6 h-6" />
                      </Box>
                    )}
                    <Box>
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <Text size="xs" variant="muted">/{org.slug}</Text>
                    </Box>
                  </Flex>
                  {org.current_user_role && (
                    <RoleBadge role={org.current_user_role} type="project" variant="secondary" />
                  )}
                </Flex>
                <CardDescription className="mt-2">
                  {org.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Flex className="items-center gap-4 text-sm text-muted-foreground mb-4">
                  <Flex className="items-center gap-1">
                    <FolderKanban className="w-4 h-4" />
                    <Text as="span">{org.project_count || 0} projects</Text>
                  </Flex>
                  <Flex className="items-center gap-1">
                    <Users className="w-4 h-4" />
                    <Text as="span">{org.member_count || 0} members</Text>
                  </Flex>
                </Flex>
                <Flex className="gap-2">
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

                </Flex>
              </CardContent>
            </Card>
          ))}
        </Grid>

        <Flex className="gap-4">
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
              <VStack className="space-y-4">
                <Box>
                  <Label>Invitation Link</Label>
                  <Input
                    value={inviteLink}
                    onChange={(e) => setInviteLink(e.target.value)}
                    placeholder="https://nit.nicorp.tech/invite/abc123..."
                  />
                </Box>
                <Flex className="justify-end gap-2">
                  <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleJoinWithLink}>
                    Join Organization
                  </Button>
                </Flex>
              </VStack>
            </DialogContent>
          </Dialog>
        </Flex>

        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Organization Password Required</DialogTitle>
              <DialogDescription>
                {selectedOrgForPassword?.name} requires a password to access
              </DialogDescription>
            </DialogHeader>
            <VStack className="space-y-4">
              <Box>
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
              </Box>
              <Flex className="justify-end gap-2">
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
              </Flex>
            </VStack>
          </DialogContent>
        </Dialog>
      </Box>
    </Flex>
  );
}

