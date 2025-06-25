import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Project, ProjectStatus, User, Dashboard, DashboardMember } from '../types';
import { loadProjects, loadTeamMembers, saveProjects, saveTeamMembers, getDarkMode, saveDarkMode } from './storage';
import { api } from './api';

interface AppContextType {
  // User state
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  
  // Projects state
  projects: Project[];
  currentProject: Project | null;
  addProject: (project: Omit<Project, 'id' | 'createdAt'> & { dashboard_id?: string }) => void;
  deleteProject: (id: string) => void;
  moveProject: (projectId: string, newStatus: ProjectStatus) => void;
  reorderProjects: (draggedId: string, targetId: string, position: 'above' | 'below') => void;
  fetchProject: (projectId: string, token: string) => Promise<Project | null>;
  
  // Team members state
  teamMembers: string[];
  addTeamMember: (name: string) => void;
  removeTeamMember: (name: string) => void;
  
  // User management for task assignments
  users: User[];
  fetchUsers: (token: string) => Promise<void>;
  
  // Dashboard state
  dashboards: Dashboard[];
  loadDashboards: () => Promise<Dashboard[]>;
  getDashboard: (id: string) => Promise<any>;
  createDashboard: (data: {name: string, description?: string}) => Promise<Dashboard>;
  deleteDashboard: (id: string) => Promise<void>;
  
  // Dashboard members state
  getDashboardMembers: (dashboardId: string) => Promise<DashboardMember[]>;
  inviteUserByTelegramId: (dashboardId: string, telegramId: number, role?: string) => Promise<void>;
  removeDashboardMember: (dashboardId: string, memberId: string) => Promise<void>;
  
  // Theme state
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  // User state - load from local storage if available
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>(['You']);
  const [users, setUsers] = useState<User[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => getDarkMode());
  
  // Load data when user changes
  useEffect(() => {
    const fetchData = async () => {
      if (currentUser && currentUser.token) {
        try {
          // Загружаем данные о дашбордах
          const dashboardsData = await api.dashboards.getAll(currentUser.token);
          if (dashboardsData && Array.isArray(dashboardsData)) {
            setDashboards(dashboardsData as Dashboard[]);
          }
          
          // Загружаем проекты 
          const backendProjects = await api.projects.getAll(currentUser.token);
          if (backendProjects && Array.isArray(backendProjects)) {
            setProjects(backendProjects as Project[]);
          } else {
            // Fallback to local storage if API fails
            const loadedProjects = loadProjects(currentUser.id);
            setProjects(loadedProjects);
          }
          
          // Try to get dashboard data (which includes team members)
          // For now fallback to local storage for team members
          const loadedTeamMembers = loadTeamMembers(currentUser.id);
          setTeamMembers(loadedTeamMembers);
        } catch (error) {
          console.error('Error loading data from API:', error);
          // Fallback to local storage
          const loadedProjects = loadProjects(currentUser.id);
          const loadedTeamMembers = loadTeamMembers(currentUser.id);
          
          setProjects(loadedProjects);
          setTeamMembers(loadedTeamMembers);
        }
      }
    };
    
    fetchData();
  }, [currentUser]);
  
  // Dark mode effect
  useEffect(() => {
    const html = document.documentElement;
    
    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    
    saveDarkMode(isDarkMode);
  }, [isDarkMode]);
  
  // Login function
  const login = (user: User) => {
    setCurrentUser(user);
    // Save user data to local storage for session persistence
    localStorage.setItem('currentUser', JSON.stringify(user));
  };
  
  // Logout function
  const logout = () => {
    // Clear user data
    setCurrentUser(null);
    setProjects([]);
    setTeamMembers(['You']);
    
    // Clear local storage
    localStorage.removeItem('currentUser');
    
    // Force page reload to clear any state
    window.location.reload();
  };
  
  // Add new project
  const addProject = async (projectData: Omit<Project, 'id' | 'createdAt'> & { dashboard_id?: string }) => {
    try {
      if (currentUser && currentUser.token) {
        // Create project via API
        const apiProject = {
          name: projectData.name,
          description: projectData.description,
          priority: projectData.priority,
          status: projectData.status,
          assignee: projectData.assignee,
          order: projectData.order || 1000, // Добавляем обязательное поле order
          dashboard_id: projectData.dashboard_id
        };
        
        const newProject = await api.projects.create(apiProject, currentUser.token);
        setProjects([...projects, newProject as Project]);
      } else {
        // Fallback to local storage
        const uuid = crypto.randomUUID();
        const newProject: Project = {
          ...projectData,
          id: uuid,
          order: projects.filter(p => p.status === projectData.status).length,
          createdAt: new Date().toISOString()
        };
        
        const newProjects = [...projects, newProject];
        setProjects(newProjects);
        
        if (currentUser) {
          saveProjects(currentUser.id, newProjects);
        }
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    }
  };
  
  // Delete project
  const deleteProject = async (id: string) => {
    try {
      if (currentUser && currentUser.token) {
        // Delete project via API
        await api.projects.delete(id, currentUser.token);
        const newProjects = projects.filter(project => project.id !== id);
        setProjects(newProjects);
      } else {
        // Fallback to local storage
        const newProjects = projects.filter(project => project.id !== id);
        setProjects(newProjects);
        
        if (currentUser) {
          saveProjects(currentUser.id, newProjects);
        }
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };
  
  // Move project to new status
  const moveProject = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      // Find the project to update
      const projectToUpdate = projects.find(p => p.id === projectId);
      if (!projectToUpdate) return;
      
      // Create updated projects array locally first for responsive UI
      const newProjects = projects.map(project => 
        project.id === projectId 
          ? { ...project, status: newStatus, order: projects.filter(p => p.status === newStatus).length }
          : project
      );
      
      // Update state immediately for UI responsiveness
      setProjects(newProjects);
      
      if (currentUser && currentUser.token) {
        // Update project via API
        const response = await api.projects.updateStatus(
          projectId, 
          newStatus,
          currentUser.token
        );
        
        // If API response is successful but doesn't return updated data,
        // leave the optimistically updated state as is
        if (response && typeof response === 'object') {
          // If API returns the updated project, sync with it
          const updatedProjects = projects.map(p => 
            p.id === projectId ? { ...p, ...response } : p
          );
          setProjects(updatedProjects);
        }
      } else if (currentUser) {
        // Fallback to local storage
        saveProjects(currentUser.id, newProjects);
      }
    } catch (error) {
      console.error('Error updating project status:', error);
      // Rollback the change if API call fails
      const loadedProjects = currentUser?.token ? 
        await api.projects.getAll(currentUser.token) : 
        loadProjects(currentUser?.id || '');
      setProjects(loadedProjects as Project[]);
      alert('Failed to update project status. Please try again.');
    }
  };
  
  // Reorder projects (for drag and drop)
  const reorderProjects = async (draggedId: string, targetId: string, position: 'above' | 'below') => {
    try {
      const draggedProject = projects.find(p => p.id === draggedId);
      const targetProject = projects.find(p => p.id === targetId);
      
      if (!draggedProject || !targetProject) return;
      
      // Save original state for potential rollback
      const originalStatus = draggedProject.status;
      
      // If moving to a different status
      const statusChanged = draggedProject.status !== targetProject.status;
      
      // Create a deep copy to avoid mutation issues
      const draggedProjectCopy = { ...draggedProject };
      if (statusChanged) {
        draggedProjectCopy.status = targetProject.status;
      }
      
      // Reorder projects within status group
      const statusProjects = projects
        .filter(p => p.status === targetProject.status && p.id !== draggedId)
        .sort((a, b) => a.order - b.order);
      
      const targetIndex = statusProjects.findIndex(p => p.id === targetId);
      let insertIndex = position === 'above' ? targetIndex : targetIndex + 1;
      
      // Insert dragged project at new position
      statusProjects.splice(insertIndex, 0, draggedProjectCopy);
      
      // Update orders for all projects in this status
      statusProjects.forEach((project, index) => {
        project.order = index;
      });
      
      // Combine with projects in other statuses
      const otherProjects = projects.filter(p => p.status !== targetProject.status && p.id !== draggedId);
      const projectsInOriginalStatus = statusChanged ? 
        projects.filter(p => p.status === originalStatus) : [];
      
      // Create a new projects array with the updated order
      const newProjects = [
        ...statusProjects,
        ...otherProjects,
        ...projectsInOriginalStatus
      ].filter((project, index, self) => 
        // Remove any duplicates that might have been created
        index === self.findIndex(p => p.id === project.id)
      );
      
      // Update state immediately for responsive UI
      setProjects(newProjects);
      
      if (currentUser && currentUser.token) {
        // Use API to update project status if needed
        if (statusChanged) {
          await api.projects.updateStatus(
            draggedId,
            targetProject.status,
            currentUser.token
          );
        }
        
        // Send reorder data to API
        const reorderData = {
          projectId: draggedId,
          targetProjectId: targetId,
          position: position
        };
        const response = await api.projects.reorder(reorderData, currentUser.token);
        
        // If the API returns new ordering data, use it to update the state
        if (response && typeof response === 'object' && Array.isArray(response)) {
          setProjects(response as Project[]);
        }
      } else if (currentUser) {
        // Fallback to local storage
        saveProjects(currentUser.id, newProjects);
      }
    } catch (error) {
      console.error('Error reordering projects:', error);
      // Reload projects to restore correct order
      if (currentUser?.token) {
        const backendProjects = await api.projects.getAll(currentUser.token);
        setProjects(backendProjects as Project[]);
      } else if (currentUser) {
        const loadedProjects = loadProjects(currentUser.id);
        setProjects(loadedProjects);
      }
      alert('Failed to reorder projects. Please try again.');
    }
  };
  
  // Add team member
  const addTeamMember = (name: string) => {
    if (name && !teamMembers.includes(name)) {
      const newTeamMembers = [...teamMembers, name];
      setTeamMembers(newTeamMembers);
      
      if (currentUser) {
        saveTeamMembers(currentUser.id, newTeamMembers);
      }
    }
  };
  
  // Remove team member
  const removeTeamMember = (name: string) => {
    if (name !== 'You') { // Don't allow removing yourself
      const newTeamMembers = teamMembers.filter(member => member !== name);
      setTeamMembers(newTeamMembers);
      
      if (currentUser) {
        saveTeamMembers(currentUser.id, newTeamMembers);
      }
    }
  };
  
  // Toggle dark/light theme
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };
  
    // Функции для работы с дашбордами
  const loadDashboards = async () => {
    if (!currentUser?.token) {
      return [];
    }
    try {
      const data = await api.dashboards.getAll(currentUser.token);
      setDashboards(data as Dashboard[]);
      return data as Dashboard[];
    } catch (error) {
      console.error('Error loading dashboards:', error);
      return [];
    }
  };

  const getDashboard = async (id: string) => {
    if (!currentUser?.token) {
      throw new Error('User not authenticated');
    }
    try {
      return await api.dashboards.getOne(id, currentUser.token);
    } catch (error) {
      console.error(`Error getting dashboard ${id}:`, error);
      throw error;
    }
  };

  const createDashboard = async (data: {name: string, description?: string}) => {
    if (!currentUser?.token) {
      throw new Error('User not authenticated');
    }
    try {
      const newDashboard = await api.dashboards.create(data, currentUser.token);
      setDashboards([...dashboards, newDashboard as Dashboard]);
      return newDashboard as Dashboard;
    } catch (error) {
      console.error('Error creating dashboard:', error);
      throw error;
    }
  };

  const deleteDashboard = async (id: string) => {
    if (!currentUser?.token) {
      throw new Error('User not authenticated');
    }
    try {
      await api.dashboards.delete(id, currentUser.token);
      setDashboards(dashboards.filter(d => d.id !== id));
    } catch (error) {
      console.error(`Error deleting dashboard ${id}:`, error);
      throw error;
    }
  };

  // Функции для работы с участниками дашборда
  // Fetch a single project by ID
  const fetchProject = async (projectId: string, token: string): Promise<Project | null> => {
    try {
      const project = await api.projects.getOne(projectId, token);
      setCurrentProject(project as Project);
      return project as Project;
    } catch (error) {
      console.error(`Error fetching project ${projectId}:`, error);
      return null;
    }
  };

  // Fetch users for task assignments
  const fetchUsers = async (token: string): Promise<void> => {
    try {
      const fetchedUsers = await api.users.getAll(token);
      setUsers(fetchedUsers as User[]);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const getDashboardMembers = async (dashboardId: string): Promise<DashboardMember[]> => {
    if (!currentUser?.token) {
      throw new Error('User not authenticated');
    }
    try {
      const members = await api.dashboards.getMembers(dashboardId, currentUser.token);
      return members as DashboardMember[];
    } catch (error) {
      console.error(`Error getting dashboard members for ${dashboardId}:`, error);
      throw error;
    }
  };
  
  const inviteUserByTelegramId = async (dashboardId: string, telegramId: number, role: string = 'viewer') => {
    if (!currentUser?.token) {
      throw new Error('User not authenticated');
    }
    try {
      await api.dashboards.inviteByTelegram(dashboardId, { telegram_id: telegramId, role }, currentUser.token);
    } catch (error) {
      console.error(`Error inviting user to dashboard ${dashboardId}:`, error);
      throw error;
    }
  };
  
  const removeDashboardMember = async (dashboardId: string, memberId: string) => {
    if (!currentUser?.token) {
      throw new Error('User not authenticated');
    }
    try {
      await api.dashboards.removeMember(dashboardId, memberId, currentUser.token);
    } catch (error) {
      console.error(`Error removing member from dashboard ${dashboardId}:`, error);
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        login,
        logout,
        projects,
        currentProject,
        addProject,
        deleteProject,
        moveProject,
        reorderProjects,
        fetchProject,
        teamMembers,
        addTeamMember,
        removeTeamMember,
        users,
        fetchUsers,
        dashboards,
        loadDashboards,
        getDashboard,
        createDashboard,
        deleteDashboard,
        getDashboardMembers,
        inviteUserByTelegramId,
        removeDashboardMember,
        isDarkMode,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the app context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
