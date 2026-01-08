import { useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

export function useRouteState() {
  const location = useLocation();
  const { currentOrganization, currentProject } = useAppContext();

  const path = location.pathname;

  const isOrganizationsPage = path === '/organizations' ||
    path === '/organizations/create' ||
    path.startsWith('/invite/') ||
    path.startsWith('/sso/');

  const isCallPage = path.startsWith('/call/');

  const isInProject = !!path.match(/^\/[^/]+\/projects\/[^/]+/) || (isCallPage && currentProject !== null);
  const isInOrganization = !!path.match(/^\/[^/]+\/(projects|calls|account-organization|settings)$/) || (isCallPage && currentOrganization !== null && currentProject === null);

  const orgIdFromUrl = path.match(/^\/([^/]+)/)?.[1];
  const projectIdFromUrl = path.match(/\/projects\/([^/]+)/)?.[1];

  return {
    isOrganizationsPage,
    isInOrganization,
    isInProject,
    isCallPage,
    orgIdFromUrl,
    projectIdFromUrl,
    currentOrganization,
    currentProject,
  };
}
