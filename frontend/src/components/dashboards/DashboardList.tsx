import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../utils/AppContext';
import { api } from '../../utils/api';
import type { Dashboard } from '../../types';

const DashboardList: React.FC = () => {
  const { currentUser } = useAppContext();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDescription, setNewDashboardDescription] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch dashboards
    const fetchDashboards = async () => {
      if (!currentUser?.token) return;
      
      try {
        setIsLoading(true);
        const data = await api.dashboards.getAll(currentUser.token);
        setDashboards(data as Dashboard[]);
        setError(null);
      } catch (error) {
        console.error('Failed to load dashboards:', error);
        setError('Failed to load dashboards.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboards();
  }, [currentUser]);

  const handleCreateDashboard = async () => {
    if (!currentUser?.token || !newDashboardName.trim()) return;
    
    try {
      const newDashboard = await api.dashboards.create({
        name: newDashboardName.trim(),
        description: newDashboardDescription.trim()
      }, currentUser.token);
      
      setDashboards([...dashboards, newDashboard as Dashboard]);
      setShowCreateModal(false);
      setNewDashboardName('');
      setNewDashboardDescription('');
    } catch (err) {
      console.error('Failed to create dashboard:', err);
      setError('Failed to create dashboard. Please try again.');
    }
  };

  const handleDashboardClick = (dashboardId: string) => {
    navigate(`/dashboards/${dashboardId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Your Dashboards</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
        >
          Create Dashboard
        </button>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">You don't have any dashboards yet. Create one to get started!</p>
            </div>
          ) : (
            dashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                onClick={() => handleDashboardClick(dashboard.id)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{dashboard.name}</h3>
                {dashboard.description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{dashboard.description}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                  Created: {new Date(dashboard.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Create dashboard modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={(e) => {
            // Закрытие при клике вне модального окна
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div className="flex items-center justify-center min-h-screen p-4 w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Create New Dashboard</h3>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Dashboard Name</label>
                <input
                  type="text"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Description</label>
                <textarea
                  value={newDashboardDescription}
                  onChange={(e) => setNewDashboardDescription(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-24"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-800 dark:hover:text-white transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateDashboard}
                  disabled={!newDashboardName.trim()}
                  className={`bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition ${
                    !newDashboardName.trim() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardList;
