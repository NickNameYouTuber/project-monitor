import React, { useEffect, useState } from 'react';
import { Plus, Trash2, UserPlus, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { RoleBadge } from '../role-badge';
import { useNotifications } from '../../hooks/useNotifications';
import UserAutocomplete from '../calls/UserAutocomplete';
import type { UserDto } from '../../api/users';
import { listProjectMembers, addProjectMember, removeProjectMember, updateProjectMemberRole, type ProjectMemberDto } from '../../api/project-members';

interface MembersTabProps {
  projectId: string;
  permissions: any;
}

export function MembersTab({ projectId, permissions }: MembersTabProps) {
  const { showSuccess, showError } = useNotifications();
  const [members, setMembers] = useState<ProjectMemberDto[]>([]);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserDto[]>([]);
  const [newMemberRole, setNewMemberRole] = useState('DEVELOPER');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadMembers = async () => {
    try {
      const data = await listProjectMembers(projectId);
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
      showError('Failed to load project members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [projectId]);

  const handleAddMember = async () => {
    if (selectedUsers.length === 0) return;

    setProcessingId('add');
    try {
      for (const user of selectedUsers) {
        await addProjectMember(projectId, user.id, newMemberRole);
      }
      showSuccess(`Added ${selectedUsers.length} member(s) to project`);
      setSelectedUsers([]);
      setNewMemberRole('DEVELOPER');
      setIsAddMemberOpen(false);
      loadMembers();
    } catch (error) {
      console.error('Failed to add member:', error);
      showError('Failed to add member to project');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }

    setProcessingId(memberId);
    try {
      await removeProjectMember(projectId, memberId);
      showSuccess('Member removed from project');
      loadMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
      showError('Failed to remove member');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateRole = async (member: ProjectMemberDto, newRole: string) => {
    setProcessingId(member.id);
    try {
      await updateProjectMemberRole(projectId, member.id, newRole);
      showSuccess('Member role updated');
      loadMembers();
    } catch (error) {
      console.error('Failed to update role:', error);
      showError('Failed to update member role');
    } finally {
      setProcessingId(null);
    }
  };

  const availableRoles = [
    { value: 'OWNER', label: 'Owner', color: '#eab308' },
    { value: 'ADMIN', label: 'Admin', color: '#ef4444' },
    { value: 'DEVELOPER', label: 'Developer', color: '#3b82f6' },
    { value: 'VIEWER', label: 'Viewer', color: '#6b7280' },
  ];

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage who has access to this project.</CardDescription>
        </div>
        {permissions.canManageMembers && (
          <Button onClick={() => setIsAddMemberOpen(true)} className="shadow-sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading member list...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 border-2 border-dashed rounded-lg bg-muted/20">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-medium">No members found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-1">Start by adding members from your organization to this project.</p>
            </div>
            {permissions.canManageMembers && (
              <Button variant="outline" onClick={() => setIsAddMemberOpen(true)}>
                Add First Member
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-border/50 overflow-hidden">
            {members.map((member, index) => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors ${index !== members.length - 1 ? 'border-b border-border/50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="w-10 h-10 border border-border/50">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {(member.user?.username || 'U').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{member.user?.display_name || member.user?.username || 'Unknown User'}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{member.user?.username || member.user_id}</p>
                      {!permissions.canManageMembers && <RoleBadge role={member.role} type="project" />}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {permissions.canManageMembers && (
                    <>
                      <div className="hidden md:block">
                        <Select
                          value={member.role}
                          onValueChange={(newRole) => handleUpdateRole(member, newRole)}
                          disabled={member.role === 'OWNER' && members.filter(m => m.role === 'OWNER').length <= 1}
                        >
                          <SelectTrigger className="w-[140px] h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map(role => (
                              <SelectItem key={role.value} value={role.value}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                                  {role.label}
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
                        disabled={
                          processingId === member.id ||
                          (member.role === 'OWNER' && members.filter(m => m.role === 'OWNER').length <= 1)
                        }
                      >
                        {processingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Project Member</DialogTitle>
            <DialogDescription>
              Select users from your organization to add to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <UserAutocomplete
                selectedUsers={selectedUsers}
                onUsersChange={setSelectedUsers}
                label=""
                projectId={projectId}
              // Note: UserAutocomplete needs to be organization-aware to strictly show org members
              // Assuming it fetches efficiently or we might need to filter. 
              // Usually it searches ALL users? No, it should be org scoped.
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                        {role.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMember} disabled={selectedUsers.length === 0 || processingId === 'add'}>
                {processingId === 'add' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Members
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

