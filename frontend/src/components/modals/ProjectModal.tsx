import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../utils/AppContext';
import type { ProjectStatus, ProjectPriority, DashboardMember } from '../../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId?: string;
  dashboardMembers?: DashboardMember[];
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, dashboardId, dashboardMembers = [] }) => {
  const { addProject, currentUser } = useAppContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('Team');
  const [priority, setPriority] = useState<ProjectPriority>('medium');
  const [status, setStatus] = useState<ProjectStatus>('inPlans');

  // Reset form when modal is opened
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setAssignee('Team');
      setPriority('medium');
      setStatus('inPlans');
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser?.token) return;
    
    // Используем dashboardId, если он передан
    const projectData = {
      name,
      description,
      assignee,
      priority,
      status,
      dashboard_id: dashboardId,
      order: 1000 // Добавляем поле order для новых проектов
    };
    
    addProject(projectData);
    onClose();
  };

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="flex items-center justify-center min-h-screen p-4 w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Add New Project</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Project Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-24" 
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Assigned To</label>
              <select 
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="Team">Team</option>
                {currentUser?.username && (
                  <option value={currentUser.username}>You</option>
                )}
                {dashboardMembers.map(member => (
                  member.user && member.user.username !== currentUser?.username && (
                    <option key={member.user.username} value={member.user.username}>
                      {member.user.username}
                    </option>
                  )
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Priority</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="inPlans">In Plans</option>
                <option value="inProgress">In Progress</option>
                <option value="onPause">On Pause</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-800 dark:hover:text-white transition"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
              >
                Add Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
