import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../utils/AppContext';
import type { ProjectStatus, ProjectPriority, DashboardMember } from '../../types';
import CloseButton from '../ui/CloseButton';

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
      className="fixed inset-0 bg-overlay z-50 flex items-center justify-center p-4 sm:p-0"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto">
        <div className="bg-bg-card rounded-lg shadow-xl overflow-hidden w-full">
          <div className="px-4 py-3 sm:px-6 border-b border-border-primary flex justify-between items-center">
            <h3 className="text-lg sm:text-xl font-semibold text-text-primary">Add New Project</h3>
            <CloseButton onClick={onClose} />
          </div>
          <div className="p-4 sm:p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-text-secondary text-sm font-bold mb-2">Project Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-bg-secondary text-text-primary" 
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-text-secondary text-sm font-bold mb-2">Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-bg-secondary text-text-primary h-24" 
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-text-secondary text-sm font-bold mb-2">Assigned To</label>
              <select 
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-bg-secondary text-text-primary"
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
              <label className="block text-text-secondary text-sm font-bold mb-2">Priority</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-bg-secondary text-text-primary"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-text-secondary text-sm font-bold mb-2">Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-bg-secondary text-text-primary"
              >
                <option value="inPlans">In Plans</option>
                <option value="inProgress">In Progress</option>
                <option value="onPause">On Pause</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3 mt-4">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-hover transition w-full sm:w-auto"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg transition w-full sm:w-auto mb-2 sm:mb-0"
              >
                Add Project
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
