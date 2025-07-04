import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../utils/AppContext';
import { api } from '../../utils/api';
import type { DashboardDetail as DashboardDetailType, DashboardMember } from '../../types';
import ProjectBoard from '../project/ProjectBoard';
import ProjectModal from '../modals/ProjectModal';
import CloseButton from '../ui/CloseButton';

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
      <div className="flex justify-center py-10">
        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-state-error/10 border-l-4 border-state-error p-4 my-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-state-error" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-state-error">{error}</p>
            <button
              onClick={() => navigate('/dashboards')}
              className="text-sm text-state-error hover:text-state-error/80 font-medium mt-2"
            >
              Back to Dashboards
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-10">
        <p className="text-text-secondary">Dashboard not found</p>
        <button
          onClick={() => navigate('/dashboards')}
          className="text-primary hover:text-primary/80 font-medium mt-4"
        >
          Back to Dashboards
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-gray-600 dark:text-gray-400">{dashboard.description}</p>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowMembersSection(!showMembersSection)}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-2 px-4 rounded-md"
          >
            Members
          </button>
          <button
            onClick={openProjectModal}
            className="bg-primary hover:bg-primary-hover text-white py-2 px-4 rounded-md"
          >
            Add Project
          </button>
        </div>
      </div>

      {showMembersSection && (
        <div className="mb-8 bg-bg-card rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-text-primary">Dashboard Members</h2>
            {dashboard.owner_id === currentUser?.id && (
              <button
                onClick={openInviteByTelegramModal}
                className="bg-primary hover:bg-primary-hover text-white py-1 px-3 rounded-md text-sm"
              >
                Add Member
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-primary">
              <thead className="bg-bg-secondary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Added</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-bg-card divide-y divide-border-primary">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-text-primary font-medium">
                      {dashboard.owner_id === currentUser?.id ? 'You (Owner)' : 'Dashboard Owner'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/20 text-primary">
                      Owner
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {new Date(dashboard.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"></td>
                </tr>

                {members.map(member => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap flex items-center">
                      {member.user?.avatar && (
                        <img className="h-8 w-8 rounded-full mr-2" src={member.user.avatar} alt="" />
                      )}
                      <span className="text-text-primary">
                        {member.user?.username || 'Unknown User'}
                        {member.user_id === currentUser?.id && ' (You)'}
                      </span>
                      {member.user?.telegram_id && (
                        <span className="ml-2 text-xs text-text-muted">
                          Telegram: {member.user.telegram_id}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.role === 'admin'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : member.role === 'editor'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {dashboard.owner_id === currentUser?.id && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-state-error hover:text-state-error px-2 py-1 rounded bg-bg-secondary"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {members.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-center text-text-secondary">
                      No additional members
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-medium text-text-primary mb-4">Projects</h2>
        <ProjectBoard projects={dashboard.projects} />
      </div>

      <div className="text-center mt-8">
        <button
          onClick={openProjectModal}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md"
        >
          Add Project
        </button>
      </div>

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={closeProjectModal}
        dashboardId={dashboardId!}
        dashboardMembers={members}
      />

      {isInviteByTelegramModalOpen && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 bg-overlay z-40"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeInviteByTelegramModal();
            }}
          ></div>

          {/* modal */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeInviteByTelegramModal();
            }}
          >
            <div className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto">
              <div className="bg-bg-card rounded-lg shadow-xl overflow-hidden w-full">
                <div className="px-4 py-3 sm:px-6 border-b border-border-primary flex justify-between items-center">
                  <h3 className="text-lg sm:text-xl font-semibold text-text-primary">Invite User</h3>
                  <CloseButton onClick={closeInviteByTelegramModal} />
                </div>
                <div className="p-4 sm:p-6">
                  <div className="mb-4">
                    <label className="block text-text-secondary text-sm font-bold mb-2">Search by Username</label>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <input
                        type="text"
                        value={usernameSearch}
                        onChange={(e) => setUsernameSearch(e.target.value)}
                        placeholder="Enter username"
                        className="w-full sm:flex-1 px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-bg-secondary text-text-primary"
                      />
                      <button
                        onClick={handleSearchUsers}
                        disabled={!usernameSearch.trim() || isSearching}
                        className={`w-full sm:w-auto px-4 py-2 rounded-lg ${
                          !usernameSearch.trim() || isSearching
                            ? 'bg-bg-disabled cursor-not-allowed text-text-muted'
                            : 'bg-primary hover:bg-primary-hover transition-colors text-white'
                        }`}
                      >
                        {isSearching ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      User must have logged in to the app with Telegram at least once
                    </p>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="mb-4 max-h-40 overflow-y-auto border border-border-primary rounded-lg">
                      {searchResults.map(user => (
                        <div
                          key={user.id}
                          className="p-2 hover:bg-primary/10 cursor-pointer flex justify-between items-center border-b last:border-b-0 border-border-primary"
                          onClick={() => selectUser(user)}
                        >
                          <span className="text-text-primary font-medium">{user.username}</span>
                          <span className="text-xs text-text-muted">ID: {user.telegram_id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedUser && (
                  <div className="p-4 sm:p-6 pt-0">
                    <div className="mb-4 p-3 bg-bg-secondary rounded-lg border border-border-primary">
                      <p className="text-text-primary font-medium">
                        Selected user: {selectedUser.username}
                      </p>
                      <p className="text-sm text-text-muted">
                        Telegram ID: {selectedUser.telegram_id}
                      </p>
                    </div>

                    <input type="hidden" value={telegramId} />
                    <div className="mb-4">
                      <label className="block text-text-secondary text-sm font-bold mb-2">Role</label>
                      <select
                        value={memberRole}
                        onChange={(e) => setMemberRole(e.target.value as any)}
                        className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-bg-secondary text-text-primary"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3 mt-4">
                      <button
                        type="button"
                        onClick={closeInviteByTelegramModal}
                        className="px-4 py-2 rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-hover transition w-full sm:w-auto"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleInviteByTelegram}
                        disabled={!telegramId.trim() || !selectedUser}
                        className={`bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg transition w-full sm:w-auto mb-2 sm:mb-0 ${
                          !telegramId.trim() || !selectedUser ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Invite
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardDetail;
