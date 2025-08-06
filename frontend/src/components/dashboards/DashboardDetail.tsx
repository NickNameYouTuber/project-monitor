import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../utils/AppContext';
import { api } from '../../utils/api';
import type { DashboardDetail as DashboardDetailType, DashboardMember } from '../../types';
import ProjectBoard from '../project/ProjectBoard';
import ProjectModal from '../modals/ProjectModal';
import { 
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Loader,
  Alert,
  Stack,
  Card,
  Badge,
  Collapse,
  Modal,
  TextInput,
  Select,
  Divider,
  Avatar,
  ActionIcon,
  Box
} from '@mantine/core';
import { 
  IconAlertCircle, 
  IconPlus, 
  IconUsers, 
  IconSearch, 
  IconX, 
  IconTrash, 
  IconChevronLeft 
} from '@tabler/icons-react';

const DashboardDetail: React.FC = () => {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const { currentUser, projects } = useAppContext();
  const navigate = useNavigate();
  
  const [dashboard, setDashboard] = useState<DashboardDetailType | null>(null);
  const [members, setMembers] = useState<DashboardMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isInviteByTelegramModalOpen, setInviteByTelegramModalOpen] = useState(false);
  const [usernameSearch, setUsernameSearch] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [memberRole, setMemberRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [showMembersSection, setShowMembersSection] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{id: string, username: string, telegram_id: number}>>([]);
  const [selectedUser, setSelectedUser] = useState<{id: string, username: string, telegram_id: number} | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!currentUser?.token || !dashboardId) {
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        if (!dashboardId || !currentUser.token) {
          throw new Error('Dashboard ID or token is missing');
        }

        const dashboardData = await api.dashboards.getOne(dashboardId, currentUser.token);
        const dashboardProjects = await api.projects.getByDashboard(dashboardId, currentUser.token);
        const updatedDashboardData = {
          ...dashboardData,
          projects: dashboardProjects || []
        };
        setDashboard(updatedDashboardData as DashboardDetailType);

        const membersData = await api.dashboards.getMembers(dashboardId, currentUser.token);
        setMembers(membersData as DashboardMember[]);
        setError(null);
      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser, dashboardId]);

  useEffect(() => {
    if (dashboard && dashboardId) {
      const dashboardProjects = projects.filter(p => p.dashboard_id === dashboardId);
      let hasChanges = false;

      if (dashboard.projects.length !== dashboardProjects.length) {
        hasChanges = true;
      } else {
        const currentProjects = new Map<string, typeof dashboard.projects[0]>();
        dashboard.projects.forEach(p => currentProjects.set(p.id, p));
        for (const project of dashboardProjects) {
          const currentProject = currentProjects.get(project.id);
          if (
            !currentProject ||
            currentProject.status !== project.status ||
            currentProject.order !== project.order
          ) {
            hasChanges = true;
            break;
          }
        }
      }

      if (hasChanges) {
        setDashboard(prev => prev ? {
          ...prev,
          projects: [...dashboardProjects]
        } : null);
      }
    }
  }, [projects, dashboard, dashboardId]);

  const openProjectModal = () => setProjectModalOpen(true);
  const closeProjectModal = () => setProjectModalOpen(false);
  const openInviteByTelegramModal = () => setInviteByTelegramModalOpen(true);
  const closeInviteByTelegramModal = () => {
    setInviteByTelegramModalOpen(false);
    setUsernameSearch('');
    setTelegramId('');
    setMemberRole('viewer');
    setSearchResults([]);
    setSelectedUser(null);
    setError(null);
  };

  const handleSearchUsers = async () => {
    if (!usernameSearch.trim()) return;
    try {
      setIsSearching(true);
      const results = await api.users.searchByUsername(usernameSearch);
      setSearchResults(Array.isArray(results) ? results : []);
      setError(null);
    } catch (err) {
      console.error('Failed to search users:', err);
      setError('Failed to search users. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectUser = (user: {id: string, username: string, telegram_id: number}) => {
    setSelectedUser(user);
    setTelegramId(user.telegram_id.toString());
    setSearchResults([]);
  };

  const handleInviteByTelegram = async () => {
    if (!currentUser?.token || !dashboardId || !telegramId) return;

    try {
      const telegramIdNum = parseInt(telegramId, 10);
      if (isNaN(telegramIdNum)) {
        setError('Please enter a valid Telegram ID (numbers only)');
        return;
      }
      await api.dashboards.inviteByTelegram(
        dashboardId,
        { telegram_id: telegramIdNum, role: memberRole },
        currentUser.token
      );
      const membersData = await api.dashboards.getMembers(dashboardId, currentUser.token);
      setMembers(membersData as DashboardMember[]);
      closeInviteByTelegramModal();
      setError(null);
    } catch (err: any) {
      console.error('Failed to invite user by Telegram ID:', err);
      setError(err.message || 'Failed to invite user. Please check the Telegram ID and try again.');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentUser?.token || !dashboardId) return;
    try {
      await api.dashboards.removeMember(dashboardId, memberId, currentUser.token);
      setMembers(members.filter(member => member.id !== memberId));
      setError(null);
    } catch (err) {
      console.error('Failed to remove member:', err);
      setError('Failed to remove member. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Container py="xl">
        <Stack align="center" justify="center" h="60vh">
          <Loader color="green" size="xl" />
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container py="xl">
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Error" 
          color="red"
          variant="filled"
        >
          <Stack>
            <Text>{error}</Text>
            <Button 
              variant="white" 
              color="red" 
              onClick={() => navigate('/dashboards')}
              leftSection={<IconChevronLeft size={16} />}
              size="xs"
            >
              Back to Dashboards
            </Button>
          </Stack>
        </Alert>
      </Container>
    );
  }

  if (!dashboard) {
    return (
      <Container py="xl">
        <Paper p="xl" withBorder shadow="md" radius="md" ta="center">
          <Text size="lg" mb="md">Dashboard not found</Text>
          <Button 
            color="green" 
            onClick={() => navigate('/dashboards')}
            leftSection={<IconChevronLeft size={16} />}
          >
            Back to Dashboards
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="lg" py="md">
      <Group justify="space-between" mb="xl">
        <Stack gap="xs">
          <Title order={2}>{dashboard.name}</Title>
          {dashboard.description && (
            <Text c="dimmed" size="sm">{dashboard.description}</Text>
          )}
        </Stack>
        
        <Group>
          <Button
            variant="light"
            color="gray"
            onClick={() => setShowMembersSection(!showMembersSection)}
            leftSection={<IconUsers size={16} />}
          >
            Members
          </Button>
          <Button
            color="green"
            onClick={openProjectModal}
            leftSection={<IconPlus size={16} />}
          >
            Add Project
          </Button>
        </Group>
      </Group>

      {/* Members Section */}
      <Collapse in={showMembersSection}>
        <Paper withBorder p="md" radius="md" mb="xl">
          <Group justify="space-between" mb="md">
            <Title order={4}>Dashboard Members</Title>
            <Button 
              size="sm" 
              onClick={openInviteByTelegramModal}
              leftSection={<IconPlus size={14} />}
              variant="light" 
              color="green"
            >
              Add Member
            </Button>
          </Group>
          
          {members.length === 0 ? (
            <Text c="dimmed" ta="center" py="md">No members yet.</Text>
          ) : (
            <Stack>
              {members.map(member => (
                <Card key={member.id} withBorder shadow="xs" p="sm" radius="md">
                  <Group justify="space-between">
                    <Group>
                      <Avatar 
                        src={member.user?.avatar} 
                        alt={member.user?.username || 'User'}
                        radius="xl"
                        color="green"
                      >
                        {member.user?.username?.charAt(0) || 'U'}
                      </Avatar>
                      <Stack gap={0}>
                        <Text fw={500}>{member.user?.username || 'Unknown'}</Text>
                        <Badge size="sm" color={
                          member.role === 'admin' ? 'blue' : 
                          member.role === 'editor' ? 'green' : 'gray'
                        }>
                          {member.role}
                        </Badge>
                      </Stack>
                    </Group>
                    {member.id !== dashboard.owner_id && (
                      <ActionIcon 
                        color="red" 
                        variant="subtle" 
                        onClick={() => handleRemoveMember(member.id)}
                        title="Remove member"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </Collapse>

      {/* Projects Section */}
      <Box>
        <ProjectBoard projects={dashboard.projects} />
      </Box>

      {/* Project Modal */}
      {isProjectModalOpen && (
        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={closeProjectModal}
          dashboardId={dashboardId!}
        />
      )}

      {/* Invite by Telegram Modal */}
      <Modal
        opened={isInviteByTelegramModalOpen}
        onClose={closeInviteByTelegramModal}
        title="Invite User by Telegram"
        centered
        size="md"
      >
        <Stack>
          {error && (
            <Alert 
              icon={<IconAlertCircle size={16} />} 
              title="Error" 
              color="red" 
              variant="light"
              withCloseButton
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {!selectedUser ? (
            <>
              <Group align="flex-end">
                <TextInput
                  label="Search by Username"
                  placeholder="Enter username"
                  value={usernameSearch}
                  onChange={(e) => setUsernameSearch(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button 
                  onClick={handleSearchUsers} 
                  leftSection={<IconSearch size={16} />}
                  loading={isSearching}
                  color="green"
                >
                  Search
                </Button>
              </Group>

              {searchResults.length > 0 && (
                <Stack mt="sm">
                  <Text fw={500} size="sm">Search Results:</Text>
                  {searchResults.map(user => (
                    <Card 
                      key={user.id} 
                      withBorder 
                      p="sm" 
                      radius="md"
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => selectUser(user)}
                    >
                      <Group>
                        <Avatar radius="xl" color="green">
                          {user.username?.charAt(0) || 'U'}
                        </Avatar>
                        <Text>{user.username}</Text>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              )}
            </>
          ) : (
            <>
              <Group justify="space-between">
                <Group>
                  <Avatar radius="xl" color="green">
                    {selectedUser.username?.charAt(0) || 'U'}
                  </Avatar>
                  <Text>{selectedUser.username}</Text>
                </Group>
                <ActionIcon onClick={() => setSelectedUser(null)}>
                  <IconX size={16} />
                </ActionIcon>
              </Group>

              <Divider my="md" />

              <TextInput
                label="Telegram ID"
                placeholder="Enter Telegram ID"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                required
              />

              <Select
                label="Role"
                value={memberRole}
                onChange={(value) => setMemberRole(value as 'viewer' | 'editor' | 'admin')}
                data={[
                  { value: 'viewer', label: 'Viewer (can only view)' },
                  { value: 'editor', label: 'Editor (can edit content)' },
                  { value: 'admin', label: 'Admin (full access)' }
                ]}
              />

              <Group justify="flex-end" mt="md">
                <Button variant="light" onClick={closeInviteByTelegramModal}>
                  Cancel
                </Button>
                <Button 
                  color="green" 
                  onClick={handleInviteByTelegram}
                >
                  Invite
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Container>
  );
};

export default DashboardDetail;
