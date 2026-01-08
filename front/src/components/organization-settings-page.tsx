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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LoadingSpinner } from './loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
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
      loadSSOConfig();
      loadAvailableRoles();
    }
  }, [orgId, organization]);

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

  // Use permissions for access control if available
  const hasSettingsPermission = currentMember?.role_details?.permissions?.includes('VIEW_SETTINGS_TAB' as any)
    || currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

  const canManageSettings = hasSettingsPermission;

  if (!canManageSettings) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">You do not have permission to access organization settings</p>
            <Button className="mt-4" onClick={() => navigate('/organizations')}>
              Back to Organizations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background/50">
      <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-5xl mx-auto py-6 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/10 shadow-sm">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <span className="text-sm">Organization Settings</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-mono">/{organization.slug}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="container max-w-5xl mx-auto py-4 px-4 md:px-6">
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
              <div className="grid gap-6">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle>Organization Profile</CardTitle>
                    <CardDescription>View and manage your organization's public information.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organization Name</Label>
                        <Input value={organization.name} readOnly className="bg-muted/50" />
                        <p className="text-xs text-muted-foreground">The display name of your organization.</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slug</Label>
                        <div className="flex items-center">
                          <span className="bg-muted border border-r-0 rounded-l-md px-3 py-2 text-sm text-muted-foreground">/</span>
                          <Input value={organization.slug} readOnly className="rounded-l-none bg-muted/50" />
                        </div>
                        <p className="text-xs text-muted-foreground">The URL identifier for your organization.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                      <Input value={organization.description || 'No description provided'} readOnly className="bg-muted/50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="roles" className="mt-6 animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
              <RolesTab organizationId={orgId!} canManageRoles={canManageSettings!} />
            </TabsContent>

            <TabsContent value="members" className="mt-6 animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div className="space-y-1">
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Manage who has access to this organization.</CardDescription>
                  </div>
                  <Button onClick={() => setCreateInviteDialogOpen(true)} className="shadow-sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingMembers ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                      <LoadingSpinner />
                      <p className="text-sm text-muted-foreground">Loading member list...</p>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 border-2 border-dashed rounded-lg bg-muted/20">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Users className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">No members found</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mt-1">Start building your team by inviting new members to the organization.</p>
                      </div>
                      <Button variant="outline" onClick={() => setCreateInviteDialogOpen(true)}>
                        Invite First Member
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border/50 overflow-hidden">
                      {members.map((member, index) => (
                        <div
                          key={member.id}
                          className={`flex items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors ${index !== members.length - 1 ? 'border-b border-border/50' : ''}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                              {(member.user?.display_name || member.user?.username || '?').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{member.user?.display_name || member.user?.username}</p>
                              <p className="text-xs text-muted-foreground">{member.user?.username}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="hidden md:block">
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
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                                        {role.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={!canManageSettings || member.role === 'OWNER'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Direct add member removed - use invites only */}
            </TabsContent>

            <TabsContent value="security" className="mt-6 animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
              <div className="grid gap-6">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Key className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Organization Password</CardTitle>
                        <CardDescription>Control access to your organization with a shared password.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                      <div className="space-y-1">
                        <p className="font-medium">Require Password</p>
                        <p className="text-sm text-muted-foreground">
                          Members will need to enter a password to access this organization.
                        </p>
                      </div>
                      <Switch
                        checked={organization?.require_password || false}
                        onCheckedChange={handleTogglePassword}
                      />
                    </div>

                    {organization?.require_password && (
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-sm text-muted-foreground">
                          Password protection is active.
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setChangePasswordDialogOpen(true)}
                          className="gap-2"
                        >
                          <Key className="w-4 h-4" />
                          Change Password
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Corporate Access</CardTitle>
                        <CardDescription>Restrict membership to specific email domains.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label>Corporate Email Domain</Label>
                        <Input
                          value={corporateDomain}
                          onChange={(e) => setCorporateDomain(e.target.value)}
                          placeholder="@company.com"
                          className="max-w-md"
                        />
                        <p className="text-xs text-muted-foreground">Enter the domain required for member emails (e.g. @nicorp.tech).</p>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                        <div className="space-y-1">
                          <p className="font-medium">Enforce Corporate Email</p>
                          <p className="text-sm text-muted-foreground">
                            Require all members to have an email address from the specified domain.
                          </p>
                        </div>
                        <Switch
                          checked={requireCorporateEmail}
                          onCheckedChange={setRequireCorporateEmail}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button onClick={handleSaveSecuritySettings}>
                        Save Security Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Organization Password</DialogTitle>
                      <DialogDescription>Set a new password for this organization</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>New Password</Label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div>
                        <Label>Confirm Password</Label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setChangePasswordDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleChangePassword} disabled={!newPassword || newPassword !== confirmPassword}>
                          Change Password
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </TabsContent>

            <TabsContent value="sso" className="mt-6 animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Fingerprint className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Single Sign-On (SSO)</CardTitle>
                      <CardDescription>Configure OIDC/OAuth 2.0 identity provider for corporate authentication.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingSSO ? (
                    <div className="flex justify-center py-8"><LoadingSpinner /></div>
                  ) : (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                        <div className="space-y-1">
                          <p className="font-medium">Enable SSO Authentication</p>
                          <p className="text-sm text-muted-foreground">
                            Allow users to sign in using your corporate identity provider.
                          </p>
                        </div>
                        <Switch
                          checked={ssoEnabled}
                          onCheckedChange={setSSOEnabled}
                        />
                      </div>

                      {ssoEnabled && (
                        <div className="grid gap-6 animate-in slide-in-from-top-4 fade-in duration-300">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label>Client ID</Label>
                              <Input
                                value={ssoClientId}
                                onChange={(e) => setSSOClientId(e.target.value)}
                                placeholder="OAuth 2.0 Client ID"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Client Secret</Label>
                              <Input
                                type="password"
                                value={ssoClientSecret}
                                onChange={(e) => setSSOClientSecret(e.target.value)}
                                placeholder={ssoClientSecret ? "••••••••" : "Enter client secret"}
                              />
                              <p className="text-xs text-muted-foreground">Leave empty to keep existing secret.</p>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label>Authorization Endpoint</Label>
                              <Input
                                value={ssoAuthEndpoint}
                                onChange={(e) => setSSOAuthEndpoint(e.target.value)}
                                placeholder="https://idp.example.com/oauth/authorize"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Token Endpoint</Label>
                              <Input
                                value={ssoTokenEndpoint}
                                onChange={(e) => setSSOTokenEndpoint(e.target.value)}
                                placeholder="https://idp.example.com/oauth/token"
                              />
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label>User Info Endpoint</Label>
                              <Input
                                value={ssoUserinfoEndpoint}
                                onChange={(e) => setSSOUserinfoEndpoint(e.target.value)}
                                placeholder="https://idp.example.com/oauth/userinfo"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Issuer URL</Label>
                              <Input
                                value={ssoIssuer}
                                onChange={(e) => setSSOIssuer(e.target.value)}
                                placeholder="https://idp.example.com"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg bg-orange-500/10 border-orange-500/20">
                            <div className="space-y-1">
                              <p className="font-medium text-orange-700 dark:text-orange-400">Enforce SSO Login</p>
                              <p className="text-sm text-orange-600/80 dark:text-orange-400/80">
                                Disable regular email/password login and force all users to use SSO.
                              </p>
                            </div>
                            <Switch
                              checked={ssoRequireSSO}
                              onCheckedChange={setSSORequireSSO}
                            />
                          </div>

                          <div className="flex justify-end pt-4">
                            <Button onClick={handleSaveSSO} size="lg">
                              Save Configuration
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invites" className="mt-6 animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div className="space-y-1">
                    <CardTitle>Active Invitations</CardTitle>
                    <CardDescription>Manage and track outstanding invitations.</CardDescription>
                  </div>
                  <Button onClick={() => setCreateInviteDialogOpen(true)} className="shadow-sm">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Create Invite Link
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingInvites ? (
                    <div className="flex justify-center py-8"><LoadingSpinner /></div>
                  ) : invites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 border-2 border-dashed rounded-lg bg-muted/20">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">No active invitations</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mt-1">Create an invitation link to share with people you want to join your organization.</p>
                      </div>
                      <Button variant="outline" onClick={() => setCreateInviteDialogOpen(true)}>
                        Create First Invite
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {invites.map((invite) => (
                        <div key={invite.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <RoleBadge role={invite.role} type="project" />
                              <div className="text-xs text-muted-foreground flex gap-3">
                                <span>Created: {new Date(invite.created_at).toLocaleDateString()}</span>
                                {invite.max_uses && <span>Uses: {invite.current_uses}/{invite.max_uses}</span>}
                                {invite.expires_at && <span>Expires: {new Date(invite.expires_at).toLocaleDateString()}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 w-full max-w-[240px] md:max-w-md">
                              <code className="text-xs bg-muted px-2 py-1 rounded select-all font-mono truncate flex-1 min-w-0 block">
                                {`${window.location.origin}/invite/${invite.token}`}
                              </code>
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
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
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
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={createInviteDialogOpen} onOpenChange={setCreateInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invitation Link</DialogTitle>
            <DialogDescription>Generate a new invitation link for this organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.length > 0 ? (
                    availableRoles.map(role => (
                      <SelectItem key={role.id} value={role.name}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                          {role.name}
                        </div>
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
            </div>
            <div>
              <Label>Maximum Uses (optional)</Label>
              <Input
                type="number"
                value={inviteMaxUses}
                onChange={(e) => setInviteMaxUses(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div>
              <Label>Expiration Date (optional)</Label>
              <Input
                type="date"
                value={inviteExpiresAt}
                onChange={(e) => setInviteExpiresAt(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvite}>
                Create Invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
