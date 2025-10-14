import React, { useEffect, useState } from 'react';
import { Plus, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { RoleBadge } from '../role-badge';
import { toast } from 'sonner';
import UserAutocomplete from '../calls/UserAutocomplete';
import type { UserDto } from '../../api/users';
import { listProjectMembers, addProjectMember, removeProjectMember, updateProjectMemberRole, type ProjectMemberDto } from '../../api/project-members';

interface MembersTabProps {
  projectId: string;
  permissions: any;
}

export function MembersTab({ projectId, permissions }: MembersTabProps) {
  const [members, setMembers] = useState<ProjectMemberDto[]>([]);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserDto[]>([]);
  const [newMemberRole, setNewMemberRole] = useState('DEVELOPER');
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<ProjectMemberDto | null>(null);
  const [newRole, setNewRole] = useState('');

  const loadMembers = async () => {
    try {
      const data = await listProjectMembers(projectId);
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
      toast.error('Failed to load project members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [projectId]);

  const handleAddMember = async () => {
    if (selectedUsers.length === 0) return;

    try {
      for (const user of selectedUsers) {
        await addProjectMember(projectId, user.id, newMemberRole);
      }
      toast.success(`Added ${selectedUsers.length} member(s) to project`);
      setSelectedUsers([]);
      setNewMemberRole('DEVELOPER');
      setIsAddMemberOpen(false);
      loadMembers();
    } catch (error) {
      console.error('Failed to add member:', error);
      toast.error('Failed to add member to project');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }

    try {
      await removeProjectMember(projectId, memberId);
      toast.success('Member removed from project');
      loadMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleUpdateRole = async () => {
    if (!editingMember) return;

    try {
      await updateProjectMemberRole(projectId, editingMember.id, newRole);
      toast.success('Member role updated');
      setEditingMember(null);
      setNewRole('');
      loadMembers();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update member role');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading members...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project Members</CardTitle>
            <CardDescription>Manage who has access to this project and their roles</CardDescription>
          </div>
          {permissions.canManageMembers && (
            <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Project Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <UserAutocomplete
                      selectedUsers={selectedUsers}
                      onUsersChange={setSelectedUsers}
                      label="Select users"
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNER">Owner</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="DEVELOPER">Developer</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddMember} disabled={selectedUsers.length === 0}>
                      Add
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members in this project
            </div>
          ) : (
            members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded border">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {(member.user?.username || 'U').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.user?.username || member.user_id}</p>
                    {member.user?.display_name && (
                      <p className="text-sm text-muted-foreground">{member.user.display_name}</p>
                    )}
                    <div className="mt-1">
                      <RoleBadge role={member.role} type="project" variant="secondary" />
                    </div>
                  </div>
                </div>
                {permissions.canManageMembers && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => {
                        setEditingMember(member);
                        setNewRole(member.role);
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <p className="text-sm font-medium mt-1">{editingMember?.user?.username}</p>
            </div>
            <div>
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Owner</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="DEVELOPER">Developer</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingMember(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRole}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

