import { useAppContext as useAppContextBase } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function useAppContext() {
  return useAppContextBase();
}

export function useCurrentOrganization() {
  const { currentOrganization, organizationId } = useAppContext();
  return { organization: currentOrganization, organizationId };
}

export function useCurrentProject() {
  const { currentProject, projectId } = useAppContext();
  return { project: currentProject, projectId };
}

export function useRequireOrganization() {
  const { currentOrganization, isLoading } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !currentOrganization) {
      navigate('/organizations', { replace: true });
    }
  }, [currentOrganization, isLoading, navigate]);

  return { organization: currentOrganization, organizationId: currentOrganization?.id || null };
}
