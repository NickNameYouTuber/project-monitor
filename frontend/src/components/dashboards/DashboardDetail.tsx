import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../utils/AppContext';
import { api } from '../../utils/api';
import type { DashboardDetail as DashboardDetailType, DashboardMember, Project } from '../../types';
import ProjectBoard from '../project/ProjectBoard';
import ProjectModal from '../modals/ProjectModal';

const DashboardDetail: React.FC = () => {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  
  // Состояние дашборда и его участников
  const [dashboard, setDashboard] = useState<DashboardDetailType | null>(null);
  const [members, setMembers] = useState<DashboardMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояние для модальных окон
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isInviteByTelegramModalOpen, setInviteByTelegramModalOpen] = useState(false);
  const [telegramId, setTelegramId] = useState('');
  const [memberRole, setMemberRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');

  // Загрузка данных дашборда и участников
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser?.token || !dashboardId) return;
      
      try {
        setIsLoading(true);
        
        // Загружаем информацию о дашборде
        const dashboardData = await api.dashboards.getOne(dashboardId, currentUser.token);
        setDashboard(dashboardData as DashboardDetailType);
        
        // Загружаем участников дашборда
        const membersData = await api.dashboards.getMembers(dashboardId, currentUser.token);
        setMembers(membersData as DashboardMember[]);
        
        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentUser, dashboardId]);

  // Обработчики для модальных окон
  const openProjectModal = () => setProjectModalOpen(true);
  const closeProjectModal = () => setProjectModalOpen(false);
  const openInviteByTelegramModal = () => setInviteByTelegramModalOpen(true);
  const closeInviteByTelegramModal = () => {
    setInviteByTelegramModalOpen(false);
    setTelegramId('');
    setMemberRole('viewer');
  };

  // Функция для приглашения пользователя по Telegram ID
  const handleInviteByTelegram = async () => {
    if (!currentUser?.token || !dashboardId || !telegramId) return;
    
    try {
      const telegramIdNum = parseInt(telegramId, 10);
      if (isNaN(telegramIdNum)) {
        setError('Please enter a valid Telegram ID (numbers only)');
        return;
      }
      
      await api.dashboards.inviteByTelegram(dashboardId, { 
        telegram_id: telegramIdNum, 
        role: memberRole 
      }, currentUser.token);
      
      // Обновляем список участников
      const membersData = await api.dashboards.getMembers(dashboardId, currentUser.token);
      setMembers(membersData as DashboardMember[]);
      
      closeInviteByTelegramModal();
      setError(null);
    } catch (err: any) {
      console.error('Failed to invite user by Telegram ID:', err);
      setError(err.message || 'Failed to invite user. Please check the Telegram ID and try again.');
    }
  };

  // Функция для обработки изменений проектов
  const handleProjectsChange = (updatedProjects: Project[]) => {
    if (dashboard) {
      setDashboard({
        ...dashboard,
        projects: updatedProjects
      });
    }
  };

  // Функция для удаления участника
  const handleRemoveMember = async (memberId: string) => {
    if (!currentUser?.token || !dashboardId) return;
    
    try {
      await api.dashboards.removeMember(dashboardId, memberId, currentUser.token);
      
      // Обновляем список участников
      setMembers(members.filter(member => member.id !== memberId));
      setError(null);
    } catch (err) {
      console.error('Failed to remove member:', err);
      setError('Failed to remove member. Please try again.');
    }
  };

  // Обработчик для проектов дашборда уже определен выше

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
            <button 
              onClick={() => navigate('/dashboards')}
              className="text-sm text-red-600 hover:text-red-500 font-medium mt-2"
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
        <p className="text-gray-500 dark:text-gray-400">Dashboard not found</p>
        <button 
          onClick={() => navigate('/dashboards')}
          className="text-blue-600 hover:text-blue-500 font-medium mt-4"
        >
          Back to Dashboards
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок дашборда с кнопками действий */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">{dashboard.description}</p>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/dashboards')}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Back to Dashboards
          </button>
          <button
            onClick={openProjectModal}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
          >
            Add Project
          </button>
          <button
            onClick={openInviteByTelegramModal}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
          >
            Invite by Telegram
          </button>
        </div>
      </div>
      
      {/* Список участников */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Dashboard Members</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Added
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Владелец дашборда (всегда показываем первым) */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {dashboard.owner_id === currentUser?.id ? (
                      <span className="text-gray-900 dark:text-white font-medium">You (Owner)</span>
                    ) : (
                      <span className="text-gray-900 dark:text-white">Dashboard Owner</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    Owner
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(dashboard.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {/* Нет действий для владельца */}
                </td>
              </tr>

              {/* Другие участники */}
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {member.user?.avatar && (
                        <img className="h-8 w-8 rounded-full mr-2" src={member.user.avatar} alt="" />
                      )}
                      <span className="text-gray-900 dark:text-white">
                        {member.user?.username || 'Unknown User'}
                        {member.user_id === currentUser?.id && ' (You)'}
                      </span>
                      {member.user?.telegram_id && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          Telegram: {member.user.telegram_id}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${member.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                        member.role === 'editor' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {dashboard.owner_id === currentUser?.id && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-center text-gray-500 dark:text-gray-400">
                    No additional members
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Проекты дашборда */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Projects</h2>
        {dashboard.projects.length > 0 ? (
          <ProjectBoard 
            projects={dashboard.projects} 
            onProjectsChange={handleProjectsChange} 
          />
        ) : (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400">No projects yet</p>
            <button
              onClick={openProjectModal}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              Add First Project
            </button>
          </div>
        )}
      </div>
      
      {/* Модальное окно для добавления проекта */}
      <ProjectModal 
        isOpen={isProjectModalOpen} 
        onClose={closeProjectModal} 
        dashboardId={dashboardId} 
      />
      
      {/* Модальное окно для приглашения по Telegram ID */}
      {isInviteByTelegramModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invite User by Telegram ID</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="telegramId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Telegram ID
                </label>
                <input
                  type="text"
                  id="telegramId"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  placeholder="Enter Telegram ID"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  User must have logged in to the app with Telegram at least once
                </p>
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role
                </label>
                <select
                  id="role"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as any)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                onClick={closeInviteByTelegramModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteByTelegram}
                disabled={!telegramId.trim()}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                  telegramId.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'
                }`}
              >
                Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardDetail;
