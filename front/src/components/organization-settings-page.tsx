import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, User, UserPlus, Trash2, Key, Link as LinkIcon, Copy, X } from 'lucide-react';
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
import { toast } from 'sonner';
import { RoleBadge } from './role-badge';
import UserAutocomplete from './calls/UserAutocomplete';
import type { UserDto } from '../api/users';
import { getOrganization } from '../api/organizations';
import { listMembers, addMember, removeMember, updateMemberRole } from '../api/organization-members';
import { listInvites, createInvite, revokeInvite } from '../api/organization-invites';
import { apiClient } from '../api/client';
import type { Organization, OrganizationMember, OrganizationInvite } from '../types/organization';

export function OrganizationSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserDto[]>([]);
  const [newMemberRole, setNewMemberRole] = useState('MEMBER');

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

  useEffect(() => {
    if (orgId) {
      loadOrganization();
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
    }
  }, [orgId, organization]);

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
      toast.error('Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async () => {
    if (!orgId || selectedUsers.length === 0) return;
    try {
      for (const user of selectedUsers) {
        await addMember(orgId, { user_id: user.id, role: newMemberRole });
      }
      toast.success('Member(s) added successfully');
      setAddMemberDialogOpen(false);
      setSelectedUsers([]);
      setNewMemberRole('MEMBER');
      loadMembers();
    } catch (error) {
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!orgId) return;
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await removeMember(orgId, memberId);
      toast.success('Member removed successfully');
      loadMembers();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    if (!orgId) return;
    try {
      await updateMemberRole(orgId, memberId, newRole);
      toast.success('Role updated successfully');
      loadMembers();
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleTogglePassword = async (enabled: boolean) => {
    if (!orgId) return;
    
    if (enabled) {
      setChangePasswordDialogOpen(true);
    } else {
      try {
        await apiClient.patch(`/organizations/${orgId}`, { require_password: false });
        toast.success('Password requirement disabled');
        loadOrganization();
      } catch (error) {
        toast.error('Failed to disable password');
      }
    }
  };

  const handleChangePassword = async () => {
    if (!orgId || !newPassword || newPassword !== confirmPassword) return;
    
    try {
      await apiClient.post(`/organizations/${orgId}/password`, { password: newPassword });
      toast.success('Password updated successfully');
      setChangePasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      loadOrganization();
    } catch (error) {
      toast.error('Failed to update password');
    }
  };

  const handleSaveSecuritySettings = async () => {
    if (!orgId) return;
    
    try {
      await apiClient.patch(`/organizations/${orgId}`, {
        corporate_domain: corporateDomain || null,
        require_corporate_email: requireCorporateEmail,
      });
      toast.success('Security settings saved');
      loadOrganization();
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const loadInvites = async () => {
    if (!orgId) return;
    setLoadingInvites(true);
    try {
      const data = await listInvites(orgId);
      setInvites(data);
    } catch (error) {
      toast.error('Failed to load invites');
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!orgId) return;
    
    try {
      await createInvite(orgId, {
        role: inviteRole,
        max_uses: inviteMaxUses ? parseInt(inviteMaxUses) : undefined,
        expires_at: inviteExpiresAt || undefined,
      });
      toast.success('Invitation link created');
      setCreateInviteDialogOpen(false);
      setInviteRole('MEMBER');
      setInviteMaxUses('');
      setInviteExpiresAt('');
      loadInvites();
    } catch (error) {
      toast.error('Failed to create invite');
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!orgId) return;
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    
    try {
      await revokeInvite(orgId, inviteId);
      toast.success('Invitation revoked');
      loadInvites();
    } catch (error) {
      toast.error('Failed to revoke invite');
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Members</CardTitle>
                    <CardDescription>Manage organization members and their roles</CardDescription>
                  </div>
                  <Button onClick={() => setAddMemberDialogOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Member
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
                          <RoleBadge role={member.role} type="project" />
                          <Select
                            value={member.role}
                            onValueChange={(newRole) => handleUpdateMemberRole(member.id, newRole)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OWNER">Owner</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="MEMBER">Member</SelectItem>
                              <SelectItem value="GUEST">Guest</SelectItem>
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

            <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Member</DialogTitle>
                  <DialogDescription>Add a new member to the organization</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <UserAutocomplete
                      selectedUsers={selectedUsers}
                      onUsersChange={setSelectedUsers}
                      label="Select Users"
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={newMemberRole} onValueChange={setNewMemberRole}>
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
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddMemberDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddMember} disabled={selectedUsers.length === 0}>
                      Add Member
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
                              toast.success('Link copied to clipboard');
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
