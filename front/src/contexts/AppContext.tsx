import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { Organization } from '../types/organization';
import { getOrganization } from '../api/organizations';
import { getProject, ProjectDto } from '../api/projects';
import { getAccessToken } from '../api/client';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: Date;
  color: string;
}

interface AppContextType {
  currentOrganization: Organization | null;
  currentProject: Project | null;
  setCurrentOrganization: (org: Organization | null) => void;
  setCurrentProject: (project: Project | null) => void;
  organizationId: string | null;
  projectId: string | null;
  isLoading: boolean;
  clearContext: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'currentOrgId';

function projectDtoToProject(dto: ProjectDto): Project {
  return {
    id: dto.id,
    title: dto.name,
    description: dto.description || '',
    status: dto.status || 'inPlans',
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    color: dto.color || '#6366f1',
  };
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  // NOTE: useParams() returns empty object when AppProvider is outside <Routes>
  // So we extract IDs directly from the URL pathname
  const navigate = useNavigate();
  const location = useLocation();

  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentOrganizationRef = useRef<Organization | null>(null);
  const currentProjectRef = useRef<Project | null>(null);
  const locationRef = useRef(location.pathname);

  // Keep location ref up to date
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  // Parse orgId and projectId from URL path directly
  const pathParts = location.pathname.split('/');
  // URL pattern: /:orgId/... or /:orgId/projects/:projectId/...
  const orgIdFromUrl = pathParts.length > 1 && pathParts[1] && !['organizations', 'auth', 'invite', 'sso', 'call', 'calls', 'account'].includes(pathParts[1]) ? pathParts[1] : null;
  const projectIdFromUrl = pathParts.length > 3 && pathParts[2] === 'projects' ? pathParts[3] : null;

  const setCurrentOrganization = useCallback((org: Organization | null) => {
    setCurrentOrganizationState(org);
    currentOrganizationRef.current = org;
    if (org) {
      localStorage.setItem(STORAGE_KEY, org.id);
      if (!locationRef.current.startsWith(`/${org.id}/`)) {
        navigate(`/${org.id}/projects`, { replace: true });
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
      if (!locationRef.current.startsWith('/organizations')) {
        navigate('/organizations', { replace: true });
      }
    }
  }, [navigate]);

  const setCurrentProject = useCallback((project: Project | null) => {
    setCurrentProjectState(project);
    currentProjectRef.current = project;
  }, []);

  const clearContext = useCallback(() => {
    setCurrentOrganizationState(null);
    currentOrganizationRef.current = null;
    setCurrentProjectState(null);
    currentProjectRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token' && !e.newValue) {
        setCurrentOrganizationState(null);
        setCurrentProjectState(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const loadOrganization = async () => {
      const token = getAccessToken();
      if (!token) {
        setCurrentOrganizationState(null);
        currentOrganizationRef.current = null;
        setCurrentProjectState(null);
        currentProjectRef.current = null;
        localStorage.removeItem(STORAGE_KEY);
        setIsLoading(false);
        return;
      }

      // Only load org from URL — never fall back to stale localStorage value
      // This prevents loading an old org when navigating to /organizations, /account, etc.
      const orgId = orgIdFromUrl;

      if (!orgId || orgId === 'null' || orgId === 'undefined') {
        setCurrentOrganizationState(null);
        currentOrganizationRef.current = null;
        setCurrentProjectState(null);
        currentProjectRef.current = null;
        localStorage.removeItem(STORAGE_KEY);
        setIsLoading(false);
        return;
      }

      if (currentOrganizationRef.current && currentOrganizationRef.current.id === orgId) {
        setIsLoading(false);
        return;
      }

      try {
        const requestedOrgId = orgId;
        const org = await getOrganization(orgId);
        const currentPath = locationRef.current;
        if (!currentPath.startsWith(`/${requestedOrgId}`)) {
          setIsLoading(false);
          return;
        }
        setCurrentOrganizationState(org);
        currentOrganizationRef.current = org;
        localStorage.setItem(STORAGE_KEY, org.id);
      } catch (error: any) {
        console.error('Failed to load organization:', error);
        if (error?.response?.status === 401) {
          setCurrentOrganizationState(null);
          currentOrganizationRef.current = null;
          setCurrentProjectState(null);
          currentProjectRef.current = null;
          localStorage.removeItem(STORAGE_KEY);
        } else {
          // Only clear state if we're still on this org's page (not navigated away)
          const currentPath = locationRef.current;
          if (orgIdFromUrl && currentPath.startsWith(`/${orgIdFromUrl}`)) {
            setCurrentOrganizationState(null);
            currentOrganizationRef.current = null;
            localStorage.removeItem(STORAGE_KEY);
          }
        }
        if (!locationRef.current.startsWith('/organizations') && error?.response?.status === 401) {
          navigate('/organizations', { replace: true });
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganization();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [orgIdFromUrl, navigate]);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectIdFromUrl) {
        if (!currentProjectRef.current || currentProjectRef.current.id !== projectIdFromUrl) {
          setCurrentProjectState(null);
          currentProjectRef.current = null;
        }
        return;
      }

      if (!currentOrganizationRef.current) {
        setCurrentProjectState(null);
        currentProjectRef.current = null;
        return;
      }

      if (currentProjectRef.current && currentProjectRef.current.id === projectIdFromUrl) {
        return;
      }

      try {
        const projectDto = await getProject(projectIdFromUrl);
        if (projectDto.organization_id === currentOrganizationRef.current?.id) {
          const project = projectDtoToProject(projectDto);
          setCurrentProjectState(project);
          currentProjectRef.current = project;
        } else {
          console.warn('Project does not belong to current organization');
          setCurrentProjectState(null);
          currentProjectRef.current = null;
        }
      } catch (error) {
        console.error('Failed to load project:', error);
        setCurrentProjectState(null);
        currentProjectRef.current = null;
      }
    };

    if (currentOrganizationRef.current && projectIdFromUrl) {
      loadProject();
    } else if (!projectIdFromUrl) {
      setCurrentProjectState(null);
      currentProjectRef.current = null;
    }
  }, [projectIdFromUrl, currentOrganization]);

  const value: AppContextType = useMemo(() => ({
    currentOrganization,
    currentProject,
    setCurrentOrganization,
    setCurrentProject,
    organizationId: currentOrganization?.id || null,
    projectId: currentProject?.id || null,
    isLoading,
    clearContext,
  }), [currentOrganization, currentProject, setCurrentOrganization, setCurrentProject, isLoading, clearContext]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
