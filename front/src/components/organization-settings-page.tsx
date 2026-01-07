import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, User, UserPlus, Trash2, Key, Link as LinkIcon, Copy, X } from 'lucide-react';
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
            {canManageSettings && <TabsTrigger value="roles">Roles</TabsTrigger>}
            {canManageSettings && <TabsTrigger value="members">Members</TabsTrigger>}
            {currentMember?.role === 'OWNER' && <TabsTrigger value="security">Security</TabsTrigger>}
            {currentMember?.role === 'OWNER' && <TabsTrigger value="sso">SSO</TabsTrigger>}
            {canManageSettings && <TabsTrigger value="invites">Invites</TabsTrigger>}
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

          <TabsContent value="roles" className="mt-6">
            <RolesTab organizationId={orgId!} canManageRoles={canManageSettings!} />
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Members</CardTitle>
                    <CardDescription>Manage organization members and their roles</CardDescription>
                  </div>
                  <Button onClick={() => setCreateInviteDialogOpen(true)}>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Invite via Link
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner stages={['Loading members']} />
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No members yet</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">{member.user?.display_name || member.user?.username}</p>
                            <p className="text-xs text-muted-foreground">{member.user?.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <RoleBadge role={member.role_details || member.role} type="project" />
                          <Select
                            value={member.role}
                            onValueChange={(newRole) => handleUpdateMemberRole(member.id, newRole)}
                          >
                            <SelectTrigger className="w-32">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={member.role === 'OWNER'}
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

          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Password</CardTitle>
                <CardDescription>Require a password to access this organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Require Password</p>
                    <p className="text-xs text-muted-foreground">
                      Members will need to enter a password to access this organization
                    </p>
                  </div>
                  <Switch
                    checked={organization?.require_password || false}
                    onCheckedChange={handleTogglePassword}
                  />
                </div>

                {organization?.require_password && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setChangePasswordDialogOpen(true)}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Corporate Email</CardTitle>
                <CardDescription>Restrict membership to specific email domains</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Corporate Email Domain</Label>
                  <Input
                    value={corporateDomain}
                    onChange={(e) => setCorporateDomain(e.target.value)}
                    placeholder="@company.com"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Require Corporate Email</p>
                    <p className="text-xs text-muted-foreground">
                      All members must verify a corporate email
                    </p>
                  </div>
                  <Switch
                    checked={requireCorporateEmail}
                    onCheckedChange={setRequireCorporateEmail}
                  />
                </div>
                <Button onClick={handleSaveSecuritySettings}>
                  Save Security Settings
                </Button>
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
          </TabsContent>

          <TabsContent value="sso" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Single Sign-On (SSO)</CardTitle>
                <CardDescription>Configure OIDC/OAuth 2.0 identity provider for corporate authentication</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSSO ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner stages={['Loading SSO configuration']} />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Enable SSO</p>
                        <p className="text-xs text-muted-foreground">
                          Allow users to login using corporate identity provider
                        </p>
                      </div>
                      <Switch
                        checked={ssoEnabled}
                        onCheckedChange={setSSOEnabled}
                      />
                    </div>

                    {ssoEnabled && (
                      <>
                        <div className="space-y-4 pt-4 border-t">
                          <div>
                            <Label>Client ID</Label>
                            <Input
                              value={ssoClientId}
                              onChange={(e) => setSSOClientId(e.target.value)}
                              placeholder="Your OAuth 2.0 client ID"
                            />
                          </div>

                          <div>
                            <Label>Client Secret</Label>
                            <Input
                              type="password"
                              value={ssoClientSecret}
                              onChange={(e) => setSSOClientSecret(e.target.value)}
                              placeholder="Leave empty to keep existing secret"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Secret is encrypted and securely stored
                            </p>
                          </div>

                          <div>
                            <Label>Authorization Endpoint</Label>
                            <Input
                              value={ssoAuthEndpoint}
                              onChange={(e) => setSSOAuthEndpoint(e.target.value)}
                              placeholder="https://your-idp.com/oauth2/authorize"
                            />
                          </div>

                          <div>
                            <Label>Token Endpoint</Label>
                            <Input
                              value={ssoTokenEndpoint}
                              onChange={(e) => setSSOTokenEndpoint(e.target.value)}
                              placeholder="https://your-idp.com/oauth2/token"
                            />
                          </div>

                          <div>
                            <Label>User Info Endpoint</Label>
                            <Input
                              value={ssoUserinfoEndpoint}
                              onChange={(e) => setSSOUserinfoEndpoint(e.target.value)}
                              placeholder="https://your-idp.com/oauth2/userinfo"
                            />
                          </div>

                          <div>
                            <Label>Issuer</Label>
                            <Input
                              value={ssoIssuer}
                              onChange={(e) => setSSOIssuer(e.target.value)}
                              placeholder="https://your-idp.com"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Require SSO</p>
                              <p className="text-xs text-muted-foreground">
                                Disable regular login, force SSO authentication
                              </p>
                            </div>
                            <Switch
                              checked={ssoRequireSSO}
                              onCheckedChange={setSSORequireSSO}
                            />
                          </div>

                          <Button onClick={handleSaveSSO} className="w-full">
                            Save SSO Configuration
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invites" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Invitation Links</CardTitle>
                    <CardDescription>Create and manage invitation links for your organization</CardDescription>
                  </div>
                  <Button onClick={() => setCreateInviteDialogOpen(true)}>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Create Invite
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingInvites ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner stages={['Loading invites']} />
                  </div>
                ) : invites.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No invitation links yet</p>
                ) : (
                  <div className="space-y-3">
                    {invites.map((invite) => (
                      <div key={invite.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <RoleBadge role={invite.role} type="project" />
                              {invite.revoked && <Badge variant="destructive">Revoked</Badge>}
                              {invite.is_valid && !invite.revoked && <Badge variant="secondary">Active</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created {new Date(invite.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRevokeInvite(invite.id)}
                            disabled={invite.revoked}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <Input
                            value={`${window.location.origin}/invite/${invite.token}`}
                            readOnly
                            className="text-xs"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/invite/${invite.token}`);
                              showSuccess('Link copied to clipboard');
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {invite.max_uses && (
                            <span>Uses: {invite.current_uses}/{invite.max_uses}</span>
                          )}
                          {invite.expires_at && (
                            <span>Expires: {new Date(invite.expires_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

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
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MEMBER">Member</SelectItem>
                        <SelectItem value="GUEST">Guest</SelectItem>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
