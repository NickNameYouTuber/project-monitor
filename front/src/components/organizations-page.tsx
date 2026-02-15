import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Link as LinkIcon, Settings, Users, FolderKanban, Shield } from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Badge, Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger, Input, Label, Box, Flex, VStack, Grid, Heading, Text
} from '@nicorp/nui';
import { motion } from 'framer-motion';
import { PageHeader } from './shared/page-header';
import { EmptyState } from './shared/empty-state';
import { OrgCardSkeleton } from './shared/skeleton';
import { RoleBadge } from './role-badge';
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
  const [hasLoadedNonEmpty, setHasLoadedNonEmpty] = useState(false);
  const { showError } = useNotifications();

  const fetchOrganizationsDirect = async (token: string): Promise<Organization[]> => {
    const response = await fetch('/api/organizations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: any = new Error(`Failed to load organizations: ${response.status}`);
      error.response = { status: response.status };
      throw error;
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  };

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
    setLoading(true);
    try {
      const token = getAccessToken();
      if (!token) {
        showError('Please login first');
        navigate('/auth');
        return;
      }

      const normalized = await fetchOrganizationsDirect(token);
      console.log('[OrganizationsPage] Organizations loaded:', normalized.length);

      if (normalized.length === 0) {
        try {
          const retryNormalized = await fetchOrganizationsDirect(token);
          console.log('[OrganizationsPage] Retry organizations loaded:', retryNormalized.length);
          if (retryNormalized.length > 0) {
            setOrganizations(retryNormalized);
            setHasLoadedNonEmpty(true);
          } else if (!hasLoadedNonEmpty) {
            setOrganizations([]);
          }
        } catch (retryError) {
          console.error('[OrganizationsPage] Retry after empty result failed:', retryError);
          if (!hasLoadedNonEmpty) {
            setOrganizations([]);
          }
        }
      } else {
        setOrganizations(normalized);
        setHasLoadedNonEmpty(true);
      }
    } catch (error: any) {
      console.error('Failed to load organizations:', error);
      if (error?.response?.status === 401) {
        showError('Session expired. Please login again.');
        navigate('/auth');
      } else {
        showError('Failed to load organizations. Retrying...');
        // Retry once after a short delay
        setTimeout(async () => {
          try {
            const retryToken = getAccessToken();
            if (!retryToken) {
              return;
            }
            const orgs = await fetchOrganizationsDirect(retryToken);
            if (orgs.length > 0) {
              setOrganizations(orgs);
              setHasLoadedNonEmpty(true);
            } else if (!hasLoadedNonEmpty) {
              setOrganizations([]);
            }
          } catch (retryError) {
            console.error('Retry also failed:', retryError);
            showError('Could not load organizations');
          }
        }, 1000);
      }
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
    return (
      <div className="h-full flex flex-col justify-start">
        <PageHeader
          title="Your Organizations"
          subtitle="Select an organization to view projects and collaborate with your team"
          showBreadcrumbs={false}
        />
        <Box className="flex-1 p-6 overflow-auto">
          <Grid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => <OrgCardSkeleton key={i} />)}
          </Grid>
        </Box>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-start">
      <PageHeader
        title="Your Organizations"
        subtitle="Select an organization to view projects and collaborate with your team"
        showBreadcrumbs={false}
        actions={
          <>
            <Button onClick={() => navigate('/organizations/create')} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Organization
            </Button>
            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Join with Link
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
          </>
        }
      />

      <Box className="flex-1 p-6 overflow-auto">
        {organizations.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No organizations yet"
            description="Create your first organization or join an existing one with an invite link."
            action={{
              label: 'Create Organization',
              onClick: () => navigate('/organizations/create'),
              icon: Plus,
            }}
            secondaryAction={{
              label: 'Join with Invite',
              onClick: () => setJoinDialogOpen(true),
            }}
          />
        ) : (
          <Grid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {organizations.map((org, index) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <Card className="hover:shadow-lg hover:border-primary/20 transition-all duration-200 cursor-pointer group">
                  <CardHeader>
                    <Flex className="items-start justify-between">
                      <Flex className="items-center gap-3">
                        {org.logo_url ? (
                          <img src={org.logo_url} alt={org.name} className="w-11 h-11 rounded-xl object-cover" />
                        ) : (
                          <Box className="w-11 h-11 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </Box>
                        )}
                        <Box>
                          <CardTitle className="text-base">{org.name}</CardTitle>
                          <Text size="xs" variant="muted">/{org.slug}</Text>
                        </Box>
                      </Flex>
                      {org.current_user_role && (
                        <RoleBadge role={org.current_user_role} type="project" variant="secondary" />
                      )}
                    </Flex>
                    <CardDescription className="mt-2 text-xs line-clamp-2">
                      {org.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Flex className="items-center gap-4 text-xs text-muted-foreground mb-4">
                      <Flex className="items-center gap-1.5">
                        <FolderKanban className="w-3.5 h-3.5" />
                        <Text as="span">{org.project_count || 0} projects</Text>
                      </Flex>
                      <Flex className="items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <Text as="span">{org.member_count || 0} members</Text>
                      </Flex>
                    </Flex>
                    <Flex className="gap-2">
                      {org.sso_enabled ? (
                        <>
                          <Button
                            className="flex-1"
                            size="sm"
                            onClick={() => handleSSOLogin(org)}
                          >
                            <Shield className="w-3.5 h-3.5 mr-2" />
                            Sign in with SSO
                          </Button>
                          {!org.sso_require_sso && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectOrganization(org)}
                            >
                              Open
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          className="flex-1"
                          size="sm"
                          onClick={() => handleSelectOrganization(org)}
                        >
                          Open
                        </Button>
                      )}
                    </Flex>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </Grid>
        )}
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
    </div>
  );
}

