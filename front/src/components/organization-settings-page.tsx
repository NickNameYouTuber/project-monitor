import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  User,
  UserPlus,
  Trash2,
  Key,
  Link as LinkIcon,
  Copy,
  X,
  Settings,
  Users,
  Shield,
  Fingerprint,
  Mail
} from 'lucide-react';
import { RolesTab } from './organization/roles-tab';
import { getOrganizationRoles } from '../api/roles';
import { OrgRole } from '../types/organization';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Tabs, TabsContent, TabsList, TabsTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  Label, Input, Switch, Badge,
  Box, Flex, VStack, Grid, Heading, Text
} from '@nicorp/nui';
import { LoadingSpinner } from './loading-spinner';
import { PageHeader } from './shared/page-header';
import { RoleBadge } from './role-badge';
import { useNotifications } from '../hooks/useNotifications';
// UserAutocomplete removed - members join via invite links only
import { getOrganization } from '../api/organizations';
import { listMembers, removeMember, updateMemberRole, getCurrentMember } from '../api/organization-members';
import { listInvites, createInvite, revokeInvite } from '../api/organization-invites';
import { apiClient } from '../api/client';
import type { Organization, OrganizationMember, OrganizationInvite } from '../types/organization';
import { getSSOConfig, saveSSOConfig } from '../api/sso';
import type { SSOConfiguration, SSOConfigurationRequest } from '../types/sso';

export function OrganizationSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMember, setCurrentMember] = useState<OrganizationMember | null>(null);

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<OrgRole[]>([]);
  // Direct add member states removed - use invites only

  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [corporateDomain, setCorporateDomain] = useState('');
  const [requireCorporateEmail, setRequireCorporateEmail] = useState(false);

  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [createInviteDialogOpen, setCreateInviteDialogOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviteMaxUses, setInviteMaxUses] = useState('');
  const [inviteExpiresAt, setInviteExpiresAt] = useState('');

  const [ssoConfig, setSSOConfig] = useState<SSOConfiguration | null>(null);
  const [loadingSSO, setLoadingSSO] = useState(false);
  const [ssoEnabled, setSSOEnabled] = useState(false);
  const [ssoClientId, setSSOClientId] = useState('');
  const [ssoClientSecret, setSSOClientSecret] = useState('');
  const [ssoAuthEndpoint, setSSOAuthEndpoint] = useState('');
  const [ssoTokenEndpoint, setSSOTokenEndpoint] = useState('');
  const [ssoUserinfoEndpoint, setSSOUserinfoEndpoint] = useState('');
  const [ssoIssuer, setSSOIssuer] = useState('');
  const [ssoRequireSSO, setSSORequireSSO] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (orgId) {
      loadCurrentMember();
    }
  }, [orgId]);

  useEffect(() => {
    if (organization) {
      setCorporateDomain(organization.corporate_domain || '');
      setRequireCorporateEmail(organization.require_corporate_email || false);
    }
  }, [organization]);

  useEffect(() => {
    if (orgId && organization) {
      loadMembers();
      loadInvites();
      loadAvailableRoles();
    }
  }, [orgId, organization]);

  // Lazy-load SSO config only when SSO tab is active
  useEffect(() => {
    if (activeTab === 'sso' && orgId && organization) {
      loadSSOConfig();
    }
  }, [activeTab, orgId, organization]);

  const loadAvailableRoles = async () => {
    if (!orgId) return;
    try {
      const roles = await getOrganizationRoles(orgId);
      setAvailableRoles(roles);
    } catch (error) {
      console.error('Failed to load roles', error);
    }
  };

  const loadCurrentMember = async () => {
    if (!orgId) return;
    try {
      const member = await getCurrentMember(orgId);
      setCurrentMember(member);
      await loadOrganization();
    } catch (error) {
      console.error('Failed to load current member:', error);
      showError('You do not have access to this organization');
      navigate('/organizations');
    }
  };

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

  const loadMembers = async () => {
    if (!orgId) return;
    setLoadingMembers(true);
    try {
      const data = await listMembers(orgId);
      setMembers(data);
    } catch (error) {
      showError('Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  // Direct handleAddMember removed - members join via invite links only

  const handleRemoveMember = async (memberId: string) => {
    if (!orgId) return;
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await removeMember(orgId, memberId);
      showSuccess('Member removed successfully');
      loadMembers();
    } catch (error) {
      showError('Failed to remove member');
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    if (!orgId) return;
    try {
      await updateMemberRole(orgId, memberId, newRole);
      showSuccess('Role updated successfully');
      loadMembers();
    } catch (error) {
      showError('Failed to update role');
    }
  };

  const handleTogglePassword = async (enabled: boolean) => {
    if (!orgId) return;

    if (enabled) {
      setChangePasswordDialogOpen(true);
    } else {
      try {
        await apiClient.patch(`/organizations/${orgId}`, { require_password: false });
        showSuccess('Password requirement disabled');
        loadOrganization();
      } catch (error) {
        showError('Failed to disable password');
      }
    }
  };

  const handleChangePassword = async () => {
    if (!orgId || !newPassword || newPassword !== confirmPassword) return;

    try {
      await apiClient.post(`/organizations/${orgId}/password`, { password: newPassword });
      showSuccess('Password updated successfully');
      setChangePasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      loadOrganization();
    } catch (error) {
      showError('Failed to update password');
    }
  };

  const handleSaveSecuritySettings = async () => {
    if (!orgId) return;

    try {
      await apiClient.patch(`/organizations/${orgId}`, {
        corporate_domain: corporateDomain || null,
        require_corporate_email: requireCorporateEmail,
      });
      showSuccess('Security settings saved');
      loadOrganization();
    } catch (error) {
      showError('Failed to save settings');
    }
  };

  const loadInvites = async () => {
    if (!orgId) return;
    setLoadingInvites(true);
    try {
      const data = await listInvites(orgId);
      setInvites(data);
    } catch (error) {
      showError('Failed to load invites');
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!orgId) return;

    try {
      const expiresAtFormatted = inviteExpiresAt
        ? new Date(inviteExpiresAt + 'T23:59:59Z').toISOString()
        : undefined;

      await createInvite(orgId, {
        role: inviteRole,
        max_uses: inviteMaxUses ? parseInt(inviteMaxUses) : undefined,
        expires_at: expiresAtFormatted,
      });
      showSuccess('Invitation link created');
      setCreateInviteDialogOpen(false);
      setInviteRole('MEMBER');
      setInviteMaxUses('');
      setInviteExpiresAt('');
      setActiveTab('invites'); // Switch to invites tab
      loadInvites();
    } catch (error) {
      showError('Failed to create invite');
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!orgId) return;
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      await revokeInvite(orgId, inviteId);
      showSuccess('Invitation revoked');
      loadInvites();
    } catch (error) {
      showError('Failed to revoke invite');
    }
  };

  const loadSSOConfig = async () => {
    if (!orgId) return;
    setLoadingSSO(true);
    try {
      const config = await getSSOConfig(orgId);
      if (config) {
        setSSOConfig(config);
        setSSOEnabled(config.enabled);
        setSSOClientId(config.client_id);
        setSSOAuthEndpoint(config.authorization_endpoint);
        setSSOTokenEndpoint(config.token_endpoint);
        setSSOUserinfoEndpoint(config.userinfo_endpoint);
        setSSOIssuer(config.issuer);
        setSSORequireSSO(config.require_sso);
      }
    } catch (error) {
      console.error('Failed to load SSO config:', error);
    } finally {
      setLoadingSSO(false);
    }
  };

  const handleSaveSSO = async () => {
    if (!orgId) return;

    try {
      const request: SSOConfigurationRequest = {
        provider_type: 'OIDC',
        enabled: ssoEnabled,
        client_id: ssoClientId,
        client_secret: ssoClientSecret || undefined,
        authorization_endpoint: ssoAuthEndpoint,
        token_endpoint: ssoTokenEndpoint,
        userinfo_endpoint: ssoUserinfoEndpoint,
        issuer: ssoIssuer,
        require_sso: ssoRequireSSO,
      };

      await saveSSOConfig(orgId, request);
      showSuccess('SSO configuration saved successfully');
      setSSOClientSecret('');
      loadSSOConfig();
    } catch (error) {
      showError('Failed to save SSO configuration');
    }
  };

  if (loading) {
    return <LoadingSpinner stages={['Loading Organization Settings']} />;
  }

  if (!organization) {
    return (
      <Flex className="h-full items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <Text variant="muted">Organization not found</Text>
            <Button className="mt-4" onClick={() => navigate('/organizations')}>
              Back to Organizations
            </Button>
          </CardContent>
        </Card>
      </Flex>
    );
  }

  // Use permissions for access control if available
  const hasSettingsPermission = currentMember?.role_details?.permissions?.includes('VIEW_SETTINGS_TAB' as any)
    || currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

  const canManageSettings = hasSettingsPermission;

  if (!canManageSettings) {
    return (
      <Flex className="h-full items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <Text variant="muted">You do not have permission to access organization settings</Text>
            <Button className="mt-4" onClick={() => navigate('/organizations')}>
              Back to Organizations
            </Button>
          </CardContent>
        </Card>
      </Flex>
    );
  }

  return (
    <Flex className="h-full flex-col bg-background/50">
      <PageHeader
        title={organization.name}
        subtitle="Organization Settings"
      />

      <Box className="flex-1 overflow-auto">
        <Box className="container max-w-5xl mx-auto py-4 px-4 md:px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
            <TabsList className="w-full justify-start h-auto bg-transparent p-0 border-b border-border/50 space-x-2 overflow-x-auto flex-nowrap mb-6">
              <TabsTrigger
                value="general"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-t-lg rounded-b-none h-10 px-4 pb-2 text-muted-foreground hover:text-foreground transition-all"
              >
                <Settings className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
              {canManageSettings && (
                <TabsTrigger
                  value="roles"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-t-lg rounded-b-none h-10 px-4 pb-2 text-muted-foreground hover:text-foreground transition-all"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Roles
                </TabsTrigger>
              )}
              {canManageSettings && (
                <TabsTrigger
                  value="members"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-t-lg rounded-b-none h-10 px-4 pb-2 text-muted-foreground hover:text-foreground transition-all"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Members
                </TabsTrigger>
              )}
              {currentMember?.role === 'OWNER' && (
                <TabsTrigger
                  value="security"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-t-lg rounded-b-none h-10 px-4 pb-2 text-muted-foreground hover:text-foreground transition-all"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Security
                </TabsTrigger>
              )}
              {currentMember?.role === 'OWNER' && (
                <TabsTrigger
                  value="sso"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-t-lg rounded-b-none h-10 px-4 pb-2 text-muted-foreground hover:text-foreground transition-all"
                >
                  <Fingerprint className="w-4 h-4 mr-2" />
                  SSO
                </TabsTrigger>
              )}
              {canManageSettings && (
                <TabsTrigger
                  value="invites"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-t-lg rounded-b-none h-10 px-4 pb-2 text-muted-foreground hover:text-foreground transition-all"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Invites
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="general" className="mt-6 animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
              <Grid className="gap-6">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle>Organization Profile</CardTitle>
                    <CardDescription>View and manage your organization's public information.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Grid className="md:grid-cols-2 gap-6">
                      <VStack className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organization Name</Label>
                        <Input value={organization.name} readOnly className="bg-muted/50" />
                        <Text size="xs" variant="muted">The display name of your organization.</Text>
                      </VStack>
                      <VStack className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slug</Label>
                        <Flex className="items-center">
                          <Text as="span" className="bg-muted border border-r-0 rounded-l-md px-3 py-2 text-sm text-muted-foreground">/</Text>
                          <Input value={organization.slug} readOnly className="rounded-l-none bg-muted/50" />
                        </Flex>
                        <Text size="xs" variant="muted">The URL identifier for your organization.</Text>
                      </VStack>
                    </Grid>
                    <VStack className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                      <Input value={organization.description || 'No description provided'} readOnly className="bg-muted/50" />
                    </VStack>
                  </CardContent>
                </Card>
              </Grid>
            </TabsContent>

            <TabsContent value="roles" className="mt-6 animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
              <RolesTab organizationId={orgId!} canManageRoles={canManageSettings!} />
            </TabsContent>

            <TabsContent value="members" className="mt-6 animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <VStack className="space-y-1">
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Manage who has access to this organization.</CardDescription>
                  </VStack>
                  <Button onClick={() => setCreateInviteDialogOpen(true)} className="shadow-sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingMembers ? (
                    <Flex className="flex-col items-center justify-center py-12 text-center space-y-4">
                      <LoadingSpinner />
                      <Text size="sm" variant="muted">Loading member list...</Text>
                    </Flex>
                  ) : members.length === 0 ? (
                    <Flex className="flex-col items-center justify-center py-12 text-center space-y-4 border-2 border-dashed rounded-lg bg-muted/20">
                      <Flex className="w-12 h-12 rounded-full bg-muted items-center justify-center">
                        <Users className="w-6 h-6 text-muted-foreground" />
                      </Flex>
                      <Box>
                        <Heading level={3} className="text-lg font-medium">No members found</Heading>
                        <Text variant="muted" className="max-w-sm mx-auto mt-1">Start building your team by inviting new members to the organization.</Text>
                      </Box>
                      <Button variant="outline" onClick={() => setCreateInviteDialogOpen(true)}>
                        Invite First Member
                      </Button>
                    </Flex>
                  ) : (
                    <Box className="rounded-md border border-border/50 overflow-hidden">
                      {members.map((member, index) => (
                        <Flex
                          key={member.id}
                          className={`items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors ${index !== members.length - 1 ? 'border-b border-border/50' : ''}`}
                        >
                          <Flex className="items-center gap-4">
                            <Flex className="w-10 h-10 rounded-full bg-primary/10 text-primary items-center justify-center font-semibold text-sm">
                              {(member.user?.display_name || member.user?.username || '?').substring(0, 2).toUpperCase()}
                            </Flex>
                            <Box>
                              <Text className="font-medium text-sm">{member.user?.display_name || member.user?.username}</Text>
                              <Text size="xs" variant="muted">{member.user?.username}</Text>
                            </Box>
                          </Flex>

                          <Flex className="items-center gap-3">
                            <Box className="hidden md:block">
                              <Select
                                value={availableRoles.find(r => r.name.toUpperCase() === (typeof member.role === 'string' ? member.role : member.role.name).toUpperCase())?.name || (typeof member.role === 'string' ? member.role : member.role.name)}
                                onValueChange={(newRole) => handleUpdateMemberRole(member.id, newRole)}
                                disabled={!canManageSettings || member.role === 'OWNER'}
                              >
                                <SelectTrigger className="w-[140px] h-9 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRoles.map(role => (
                                    <SelectItem key={role.id} value={role.name}>
                                      <Flex className="items-center gap-2">
                                        <Box className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                                        {role.name}
                                      </Flex>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Box>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={!canManageSettings || member.role === 'OWNER'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </Flex>
                        </Flex>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Direct add member removed - use invites only */}
            </TabsContent>

            <TabsContent value="security" className="mt-6 animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
              <Grid className="gap-6">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <Flex className="items-center gap-3">
                      <Box className="p-2 bg-primary/10 rounded-lg">
                        <Key className="w-5 h-5 text-primary" />
                      </Box>
                      <Box>
                        <CardTitle>Organization Password</CardTitle>
                        <CardDescription>Control access to your organization with a shared password.</CardDescription>
                      </Box>
                    </Flex>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Flex className="items-center justify-between p-4 border rounded-lg bg-muted/20">
                      <VStack className="space-y-1">
                        <Text weight="medium">Require Password</Text>
                        <Text size="sm" variant="muted">
                          Members will need to enter a password to access this organization.
                        </Text>
                      </VStack>
                      <Switch
                        checked={organization?.require_password || false}
                        onCheckedChange={handleTogglePassword}
                      />
                    </Flex>

                    {organization?.require_password && (
                      <Flex className="items-center justify-between pt-2">
                        <Box className="text-sm text-muted-foreground">
                          Password protection is active.
                        </Box>
                        <Button
                          variant="outline"
                          onClick={() => setChangePasswordDialogOpen(true)}
                          className="gap-2"
                        >
                          <Key className="w-4 h-4" />
                          Change Password
                        </Button>
                      </Flex>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <Flex className="items-center gap-3">
                      <Box className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="w-5 h-5 text-primary" />
                      </Box>
                      <Box>
                        <CardTitle>Corporate Access</CardTitle>
                        <CardDescription>Restrict membership to specific email domains.</CardDescription>
                      </Box>
                    </Flex>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Grid className="gap-4">
                      <VStack className="space-y-2">
                        <Label>Corporate Email Domain</Label>
                        <Input
                          value={corporateDomain}
                          onChange={(e) => setCorporateDomain(e.target.value)}
                          placeholder="@company.com"
                          className="max-w-md"
                        />
                        <Text size="xs" variant="muted">Enter the domain required for member emails (e.g. @nicorp.tech).</Text>
                      </VStack>

                      <Flex className="items-center justify-between p-4 border rounded-lg bg-muted/20">
                        <VStack className="space-y-1">
                          <Text weight="medium">Enforce Corporate Email</Text>
                          <Text size="sm" variant="muted">
                            Require all members to have an email address from the specified domain.
                          </Text>
                        </VStack>
                        <Switch
                          checked={requireCorporateEmail}
                          onCheckedChange={setRequireCorporateEmail}
                        />
                      </Flex>
                    </Grid>
                    <Flex className="justify-end pt-4">
                      <Button onClick={handleSaveSecuritySettings}>
                        Save Security Settings
                      </Button>
                    </Flex>
                  </CardContent>
                </Card>

                <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Organization Password</DialogTitle>
                      <DialogDescription>Set a new password for this organization</DialogDescription>
                    </DialogHeader>
                    <VStack className="space-y-4">
                      <Box>
                        <Label>New Password</Label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                      </Box>
                      <Box>
                        <Label>Confirm Password</Label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                        />
                      </Box>
                      <Flex className="justify-end gap-2">
                        <Button variant="outline" onClick={() => setChangePasswordDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleChangePassword} disabled={!newPassword || newPassword !== confirmPassword}>
                          Change Password
                        </Button>
                      </Flex>
                    </VStack>
                  </DialogContent>
                </Dialog>
              </Grid>
            </TabsContent>

            <TabsContent value="sso" className="mt-6 animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <Flex className="items-center gap-3">
                    <Box className="p-2 bg-primary/10 rounded-lg">
                      <Fingerprint className="w-5 h-5 text-primary" />
                    </Box>
                    <Box>
                      <CardTitle>Single Sign-On (SSO)</CardTitle>
                      <CardDescription>Configure OIDC/OAuth 2.0 identity provider for corporate authentication.</CardDescription>
                    </Box>
                  </Flex>
                </CardHeader>
                <CardContent>
                  {loadingSSO ? (
                    <Flex className="justify-center py-8"><LoadingSpinner /></Flex>
                  ) : (
                    <VStack className="space-y-8">
                      <Flex className="items-center justify-between p-4 border rounded-lg bg-muted/20">
                        <VStack className="space-y-1">
                          <Text weight="medium">Enable SSO Authentication</Text>
                          <Text size="sm" variant="muted">
                            Allow users to sign in using your corporate identity provider.
                          </Text>
                        </VStack>
                        <Switch
                          checked={ssoEnabled}
                          onCheckedChange={setSSOEnabled}
                        />
                      </Flex>

                      {ssoEnabled && (
                        <Grid className="gap-6 animate-in slide-in-from-top-4 fade-in duration-300">
                          <Grid className="md:grid-cols-2 gap-6">
                            <VStack className="space-y-2">
                              <Label>Client ID</Label>
                              <Input
                                value={ssoClientId}
                                onChange={(e) => setSSOClientId(e.target.value)}
                                placeholder="OAuth 2.0 Client ID"
                              />
                            </VStack>
                            <VStack className="space-y-2">
                              <Label>Client Secret</Label>
                              <Input
                                type="password"
                                value={ssoClientSecret}
                                onChange={(e) => setSSOClientSecret(e.target.value)}
                                placeholder={ssoClientSecret ? "••••••••" : "Enter client secret"}
                              />
                              <Text size="xs" variant="muted">Leave empty to keep existing secret.</Text>
                            </VStack>
                          </Grid>

                          <Grid className="md:grid-cols-2 gap-6">
                            <VStack className="space-y-2">
                              <Label>Authorization Endpoint</Label>
                              <Input
                                value={ssoAuthEndpoint}
                                onChange={(e) => setSSOAuthEndpoint(e.target.value)}
                                placeholder="https://idp.example.com/oauth/authorize"
                              />
                            </VStack>
                            <VStack className="space-y-2">
                              <Label>Token Endpoint</Label>
                              <Input
                                value={ssoTokenEndpoint}
                                onChange={(e) => setSSOTokenEndpoint(e.target.value)}
                                placeholder="https://idp.example.com/oauth/token"
                              />
                            </VStack>
                          </Grid>

                          <Grid className="md:grid-cols-2 gap-6">
                            <VStack className="space-y-2">
                              <Label>User Info Endpoint</Label>
                              <Input
                                value={ssoUserinfoEndpoint}
                                onChange={(e) => setSSOUserinfoEndpoint(e.target.value)}
                                placeholder="https://idp.example.com/oauth/userinfo"
                              />
                            </VStack>
                            <VStack className="space-y-2">
                              <Label>Issuer URL</Label>
                              <Input
                                value={ssoIssuer}
                                onChange={(e) => setSSOIssuer(e.target.value)}
                                placeholder="https://idp.example.com"
                              />
                            </VStack>
                          </Grid>

                          <Flex className="items-center justify-between p-4 border rounded-lg bg-orange-500/10 border-orange-500/20">
                            <VStack className="space-y-1">
                              <Text weight="medium" className="text-orange-700 dark:text-orange-400">Enforce SSO Login</Text>
                              <Text size="sm" className="text-orange-600/80 dark:text-orange-400/80">
                                Disable regular email/password login and force all users to use SSO.
                              </Text>
                            </VStack>
                            <Switch
                              checked={ssoRequireSSO}
                              onCheckedChange={setSSORequireSSO}
                            />
                          </Flex>

                          <Flex className="justify-end pt-4">
                            <Button onClick={handleSaveSSO} size="lg">
                              Save Configuration
                            </Button>
                          </Flex>
                        </Grid>
                      )}
                    </VStack>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invites" className="mt-6 animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <VStack className="space-y-1">
                    <CardTitle>Active Invitations</CardTitle>
                    <CardDescription>Manage and track outstanding invitations.</CardDescription>
                  </VStack>
                  <Button onClick={() => setCreateInviteDialogOpen(true)} className="shadow-sm">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Create Invite Link
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingInvites ? (
                    <Flex className="justify-center py-8"><LoadingSpinner /></Flex>
                  ) : invites.length === 0 ? (
                    <Flex className="flex-col items-center justify-center py-12 text-center space-y-4 border-2 border-dashed rounded-lg bg-muted/20">
                      <Flex className="w-12 h-12 rounded-full bg-muted items-center justify-center">
                        <Mail className="w-6 h-6 text-muted-foreground" />
                      </Flex>
                      <Box>
                        <Heading level={3} className="text-lg font-medium">No active invitations</Heading>
                        <Text variant="muted" className="max-w-sm mx-auto mt-1">Create an invitation link to share with people you want to join your organization.</Text>
                      </Box>
                      <Button variant="outline" onClick={() => setCreateInviteDialogOpen(true)}>
                        Create First Invite
                      </Button>
                    </Flex>
                  ) : (
                    <VStack className="space-y-4">
                      {invites.map((invite) => (
                        <Flex key={invite.id} className="flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors gap-4">
                          <VStack className="space-y-2">
                            <Flex className="items-center gap-3">
                              <RoleBadge role={invite.role} type="project" />
                              <Flex className="text-xs text-muted-foreground gap-3">
                                <Text as="span">Created: {new Date(invite.created_at).toLocaleDateString()}</Text>
                                {invite.max_uses && <Text as="span">Uses: {invite.current_uses}/{invite.max_uses}</Text>}
                                {invite.expires_at && <Text as="span">Expires: {new Date(invite.expires_at).toLocaleDateString()}</Text>}
                              </Flex>
                            </Flex>
                            <Flex className="items-center gap-2 w-full max-w-[240px] md:max-w-md">
                              <Box as="code" className="text-xs bg-muted px-2 py-1 rounded select-all font-mono truncate flex-1 min-w-0 block">
                                {`${window.location.origin}/invite/${invite.token}`}
                              </Box>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/invite/${invite.token}`);
                                  showSuccess('Copied to clipboard');
                                }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </Flex>
                          </VStack>

                          <Flex className="items-center gap-2">
                            {invite.revoked ? (
                              <Badge variant="destructive">Revoked</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">Active</Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRevokeInvite(invite.id)}
                              disabled={invite.revoked}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Revoke
                            </Button>
                          </Flex>
                        </Flex>
                      ))}
                    </VStack>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Box>
      </Box>

      <Dialog open={createInviteDialogOpen} onOpenChange={setCreateInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invitation Link</DialogTitle>
            <DialogDescription>Generate a new invitation link for this organization</DialogDescription>
          </DialogHeader>
          <VStack className="space-y-4">
            <Box>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.length > 0 ? (
                    availableRoles.map(role => (
                      <SelectItem key={role.id} value={role.name}>
                        <Flex className="items-center gap-2">
                          <Box className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                          {role.name}
                        </Flex>
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="Owner">Owner</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Member">Member</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </Box>
            <Box>
              <Label>Maximum Uses (optional)</Label>
              <Input
                type="number"
                value={inviteMaxUses}
                onChange={(e) => setInviteMaxUses(e.target.value)}
                placeholder="Unlimited"
              />
            </Box>
            <Box>
              <Label>Expiration Date (optional)</Label>
              <Input
                type="date"
                value={inviteExpiresAt}
                onChange={(e) => setInviteExpiresAt(e.target.value)}
              />
            </Box>
            <Flex className="justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvite}>
                Create Invite
              </Button>
            </Flex>
          </VStack>
        </DialogContent>
      </Dialog>
    </Flex >
  );
}
