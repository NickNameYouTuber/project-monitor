import React, { useEffect, useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './components/sidebar';
import { ProjectsPage } from './components/projects-page';
import { ProjectTasksPage } from './components/project-tasks-page';
import { RepositoryPage } from './components/repository-page';
import { RepositoriesPage } from './components/repositories-page';
import { WhiteboardPage } from './components/whiteboard-page';
import { FileEditorPage } from './components/file-editor-page';
import { CommitDetailsPage } from './components/commit-details-page';
import { AccountPage } from './components/account-page';
import { AccountOrganizationPage } from './components/account-organization-page';
import { ProjectSettingsPage } from './components/project-settings-page';
import { OrganizationsPage } from './components/organizations-page';
import { CreateOrganizationPage } from './components/create-organization-page';
import { OrganizationSettingsPage } from './components/organization-settings-page';
import { InvitePage } from './components/invite-page';
import { SSOCallbackPage } from './components/niid-callback';
import { OrganizationGuard } from './components/organization-guard';
import { CallsPage } from './components/calls-page';
import { AuthPage } from './components/auth-page';
import { setAccessToken } from './api/client';
import CallPage from './features/call/pages/CallPage';
import { Toaster } from './components/ui/sonner';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { AccountProvider } from './contexts/AccountContext';
import { useRouteState } from './hooks/useRouteState';
import { getAccessToken } from './api/client';
import { useCurrentProject } from './hooks/useAppContext';
import { listProjectMembers } from './api/project-members';
import { useMainAccount } from './hooks/useAccountContext';

export type Page = 'projects' | 'tasks' | 'whiteboard' | 'repositories' | 'repository' | 'calls' | 'account' | 'account-organization' | 'project-settings' | 'merge-request' | 'organizations' | 'settings';

export interface Column {
  id: string;
  title: string;
  color: string;
  order: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: Date;
  color: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  assignee?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  dueDate?: Date;
  repository_id?: string;
  repositoryBranch?: string;
  repositoryInfo?: {
    repositoryId: string;
    repositoryName: string;
    branch: string;
  };
}

function ProjectRouteWrapperComponent({
  projects,
  tasks,
  setTasks,
  taskColumns,
  setTaskColumns,
  assigneeSuggestions,
  branchSuggestions,
  handleNavigate,
}: {
  projects: Project[];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  taskColumns: Column[];
  setTaskColumns: React.Dispatch<React.SetStateAction<Column[]>>;
  assigneeSuggestions: string[];
  branchSuggestions: string[];
  handleNavigate: (page: Page, project?: Project) => void;
}) {
  const params = useParams();
  const navigate = useNavigate();
  const { currentProject, setCurrentProject, currentOrganization } = useAppContext();
  const [fetchedProject, setFetchedProject] = React.useState<Project | null>(null);
  const p = projects.find(pr => pr.id === params.projectId) || fetchedProject || currentProject || null;
  const repoId = (params as any).repoId as string | undefined;

  React.useEffect(() => {
    if (p) {
      setCurrentProject(p);
    }
  }, [p?.id, setCurrentProject]);

  if (!p) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 p-8">
          <div className="flex flex-col gap-1">
            {['Resolve Project', 'Fetch Data', 'Parse Info', 'Ready'].map((stage, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2"
                animate={{
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  delay: i * 0.8,
                  ease: "easeInOut",
                }}
              >
                <motion.div
                  className="w-1.5 h-1.5 bg-primary rounded-full"
                  animate={{
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    delay: i * 0.8,
                    ease: "easeInOut",
                  }}
                />
                <span className="text-foreground text-xs font-mono">{stage}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (repoId) return (
    <RepositoryPage
      projects={projects}
      tasks={tasks}
      initialRepoId={repoId}
    />
  );
  if (params.section === 'tasks') return (
    <ProjectTasksPage
      project={p}
      tasks={tasks}
      setTasks={setTasks}
      columns={taskColumns}
      setColumns={setTaskColumns}
      assigneeSuggestions={assigneeSuggestions}
      branchSuggestions={branchSuggestions}
      onBack={() => handleNavigate('projects')}
    />
  );
  if (params.section === 'whiteboard') return <WhiteboardPage project={p} />;
  if (params.section === 'repositories') return (
    <RepositoriesPage
      project={p}
      onOpenRepository={(repoId) => {
        if (currentOrganization) {
          navigate(`/${currentOrganization.id}/projects/${p.id}/repository/${repoId}`);
        } else {
          navigate(`/projects/${p.id}/repository/${repoId}`);
        }
      }}
    />
  );
  if (params.section === 'repository') return (
    <RepositoryPage
      projects={projects}
      tasks={tasks}
      initialRepoId={(params as any).repoId as string | undefined}
    />
  );
  if (params.section === 'settings') return (
    <ProjectSettingsPage project={p} />
  );
  if (params.section === 'account-organization') {
    return <AccountOrganizationPage />;
  }
  if (currentOrganization) {
    return <Navigate to={`/${currentOrganization.id}/projects/${p.id}/tasks`} replace />;
  }
  return <Navigate to="/organizations" replace />;
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('projects');
  const { currentOrganization, currentProject, setCurrentProject, organizationId } = useAppContext();
  const routeState = useRouteState();
  const { account: mainAccount } = useMainAccount();

  // Default project columns
  const [projectColumns, setProjectColumns] = useState<Column[]>([
    { id: 'backlog', title: 'Backlog', color: 'bg-gray-500', order: 0 },
    { id: 'in-progress', title: 'In Progress', color: 'bg-blue-500', order: 1 },
    { id: 'review', title: 'Review', color: 'bg-yellow-500', order: 2 },
    { id: 'completed', title: 'Completed', color: 'bg-green-500', order: 3 },
  ]);

  // Default task columns
  const [taskColumns, setTaskColumns] = useState<Column[]>([
    { id: 'todo', title: 'To Do', color: 'bg-gray-500', order: 0 },
    { id: 'in-progress', title: 'In Progress', color: 'bg-blue-500', order: 1 },
    { id: 'review', title: 'Review', color: 'bg-yellow-500', order: 2 },
    { id: 'done', title: 'Done', color: 'bg-green-500', order: 3 },
  ]);

  const [projects, setProjects] = useState<Project[]>([]);

  const [tasks, setTasks] = useState<Task[]>([]);

  // Suggestion data
  const [assigneeSuggestions, setAssigneeSuggestions] = useState<string[]>([]);

  const [branchSuggestions] = useState<string[]>([]);

  const navigate = useNavigate();
  const location = useLocation();
  const isStandaloneCall = location.pathname.startsWith('/call/');

  const handleNavigate = (page: Page, project?: Project) => {
    setCurrentPage(page);

    if (project) {
      setCurrentProject(project);
      if (organizationId) {
        const section = page === 'tasks' ? 'tasks' : page === 'whiteboard' ? 'whiteboard' : page === 'repositories' ? 'repositories' : page === 'calls' ? 'calls' : 'tasks';
        navigate(`/${organizationId}/projects/${project.id}/${section}`);
      } else {
        navigate('/organizations');
      }
      return;
    }

    if (page === 'projects') {
      setCurrentProject(null);
      if (organizationId) {
        navigate(`/${organizationId}/projects`);
      } else {
        navigate('/organizations');
      }
      return;
    }

    if (page === 'calls') {
      if (routeState.isInProject && organizationId && currentProject) {
        navigate(`/${organizationId}/projects/${currentProject.id}/calls`);
      } else if (routeState.isInOrganization && organizationId) {
        navigate(`/${organizationId}/calls`);
      } else {
        navigate('/calls');
      }
      return;
    }

    if (page === 'organizations') {
      navigate('/organizations');
      return;
    }

    if (page === 'account') {
      navigate('/account');
      return;
    }

    if (page === 'account-organization') {
      if (routeState.isInProject && organizationId && currentProject) {
        navigate(`/${organizationId}/projects/${currentProject.id}/account-organization`);
      } else if (organizationId) {
        navigate(`/${organizationId}/account-organization`);
      } else {
        navigate('/organizations');
      }
      return;
    }

    if (page === 'project-settings' && currentProject) {
      if (organizationId) {
        navigate(`/${organizationId}/projects/${currentProject.id}/settings`);
      } else {
        navigate('/organizations');
      }
      return;
    }

    if ((page === 'tasks' || page === 'whiteboard' || page === 'repositories' || page === 'repository') && currentProject) {
      if (organizationId) {
        const section = page === 'tasks' ? 'tasks' : page === 'whiteboard' ? 'whiteboard' : page === 'repositories' ? 'repositories' : 'repository';
        navigate(`/${organizationId}/projects/${currentProject.id}/${section}`);
      } else {
        navigate('/organizations');
      }
      return;
    }

    if (page === 'tasks' || page === 'whiteboard' || page === 'repositories' || page === 'repository' || page === 'project-settings') {
      if (organizationId) {
        navigate(`/${organizationId}/projects`);
      } else {
        navigate('/organizations');
      }
      return;
    }

    if (page === 'settings') {
      if (organizationId) {
        navigate(`/${organizationId}/settings`);
      } else {
        navigate('/organizations');
      }
      return;
    }

    navigate(`/${page}`);
  };

  // Мемоизируем setState функции чтобы предотвратить повторные рендеры
  const memoizedSetTasks = useCallback((tasks: Task[] | ((prev: Task[]) => Task[])) => {
    setTasks(tasks);
  }, []);

  const memoizedSetTaskColumns = useCallback((columns: Column[] | ((prev: Column[]) => Column[])) => {
    setTaskColumns(columns);
  }, []);

  // Убираем внутренний компонент маршрута, чтобы не вызывать размонтирование/монтаж при каждом рендере App

  useEffect(() => {
    if (currentProject?.id) {
      listProjectMembers(currentProject.id)
        .then(members => {
          const names = new Set<string>();

          members.forEach(member => {
            const user = member.user;
            if (user) {
              const name = user.display_name || user.username || '';
              if (name.length > 0) {
                names.add(name);
              }
            }
          });

          if (mainAccount) {
            const currentUserName = mainAccount.displayName || mainAccount.username || '';
            if (currentUserName.length > 0) {
              names.add(currentUserName);
            }
          }

          setAssigneeSuggestions(Array.from(names));
        })
        .catch(error => {
          console.error('Ошибка загрузки участников проекта:', error);
          const fallbackNames: string[] = [];
          if (mainAccount) {
            const currentUserName = mainAccount.displayName || mainAccount.username || '';
            if (currentUserName.length > 0) {
              fallbackNames.push(currentUserName);
            }
          }
          setAssigneeSuggestions(fallbackNames);
        });
    } else {
      const fallbackNames: string[] = [];
      if (mainAccount) {
        const currentUserName = mainAccount.displayName || mainAccount.username || '';
        if (currentUserName.length > 0) {
          fallbackNames.push(currentUserName);
        }
      }
      setAssigneeSuggestions(fallbackNames);
    }
  }, [currentProject?.id, mainAccount]);

  useEffect(() => {
    const checkAuth = () => {
      const token = getAccessToken();
      setIsAuthenticated(!!token);
    };

    checkAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        checkAuth();
      }
    };

    const handleAuthChanged = (e: CustomEvent) => {
      setIsAuthenticated(e.detail.authenticated);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-changed', handleAuthChanged as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleAuthChanged as EventListener);
    };
  }, []);



  // Обновляем currentPage на основе URL
  useEffect(() => {
    const path = location.pathname;

    if (path === '/organizations' || path === '/organizations/create') {
      setCurrentPage('organizations');
    } else if (path === '/calls' || path.match(/^\/[^/]+\/calls$/) || path.match(/\/projects\/[^/]+\/calls$/)) {
      setCurrentPage('calls');
    } else if (path === '/account') {
      setCurrentPage('account');
    } else if (path.match(/\/account-organization$/) || path.match(/\/projects\/[^/]+\/account-organization$/)) {
      setCurrentPage('account-organization');
    } else if (path.match(/\/projects\/[^/]+\/tasks$/)) {
      setCurrentPage('tasks');
    } else if (path.match(/\/projects\/[^/]+\/whiteboard$/)) {
      setCurrentPage('whiteboard');
    } else if (path.match(/\/projects\/[^/]+\/repositories$/)) {
      setCurrentPage('repositories');
    } else if (path.match(/\/projects\/[^/]+\/repository/)) {
      setCurrentPage('repository');
    } else if (path.match(/\/projects\/[^/]+\/settings$/)) {
      setCurrentPage('project-settings');
    } else if (path.match(/\/settings$/) && !path.match(/\/projects\/[^/]+\/settings$/)) {
      setCurrentPage('settings');
    } else if (path.match(/\/[^/]+\/projects$/) || path.match(/\/projects$/)) {
      setCurrentPage('projects');
    }
  }, [location.pathname]);

  return (
    <NotificationProvider>
      <DndProvider backend={HTML5Backend}>
        <Toaster position="top-right" richColors />
        <div className="dark min-h-screen bg-background text-foreground">
          <Routes>
            <Route path="/sso/niid/callback" element={<SSOCallbackPage />} />
            <Route path="*" element={
              !isAuthenticated ? (
                <AuthPage onLogin={() => setIsAuthenticated(true)} />
              ) : (
                <div className="flex h-screen">
                  {!isStandaloneCall && (
                    location.pathname === '/organizations' ||
                      location.pathname === '/organizations/create' ||
                      location.pathname.startsWith('/invite/') ||
                      location.pathname.startsWith('/sso/') ||
                      location.pathname.startsWith('/organizations/') ? (
                      <Sidebar
                        currentPage={currentPage}
                        onNavigate={handleNavigate}
                        selectedProject={null}
                        currentOrgId={null}
                        simplified={true}
                      />
                    ) : (
                      <Sidebar
                        currentPage={currentPage}
                        onNavigate={handleNavigate}
                        selectedProject={currentProject}
                        currentOrgId={organizationId}
                      />
                    )
                  )}
                  <main className={`flex-1 overflow-hidden ${currentPage === 'projects' || isStandaloneCall ? 'w-full' : ''}`}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/organizations" replace />} />
                      <Route path="/organizations" element={<OrganizationsPage />} />
                      <Route path="/organizations/create" element={<CreateOrganizationPage />} />
                      <Route path="/organizations" element={<OrganizationsPage />} />
                      <Route path="/organizations/create" element={<CreateOrganizationPage />} />
                      {/* Old route redirect or keep for backward compat for now, ideally redirect */}
                      <Route path="/organizations/:orgId/settings" element={<OrganizationSettingsPage />} />
                      <Route path="/:orgId/settings" element={
                        <OrganizationGuard>
                          <OrganizationSettingsPage />
                        </OrganizationGuard>
                      } />
                      <Route path="/invite/:token" element={<InvitePage />} />
                      <Route path="/sso/callback" element={<SSOCallbackPage />} />
                      <Route path="/sso/niid/callback" element={<SSOCallbackPage />} />

                      {/* Redirect old routes */}
                      <Route path="/projects" element={<Navigate to="/organizations" replace />} />
                      <Route path="/projects/*" element={<Navigate to="/organizations" replace />} />

                      {/* New routes with orgId */}
                      <Route path="/:orgId/account-organization" element={
                        <OrganizationGuard>
                          <AccountOrganizationPage />
                        </OrganizationGuard>
                      } />
                      <Route path="/:orgId/projects" element={
                        <OrganizationGuard>
                          <ProjectsPage
                            projects={projects}
                            setProjects={setProjects}
                            columns={projectColumns}
                            setColumns={setProjectColumns}
                            onProjectSelect={(project) => handleNavigate('tasks', project)}
                          />
                        </OrganizationGuard>
                      } />
                      <Route
                        path="/:orgId/projects/:projectId/:section"
                        element={
                          <OrganizationGuard>
                            <ProjectRouteWrapperComponent
                              projects={projects}
                              tasks={tasks}
                              setTasks={memoizedSetTasks}
                              taskColumns={taskColumns}
                              setTaskColumns={memoizedSetTaskColumns}
                              assigneeSuggestions={assigneeSuggestions}
                              branchSuggestions={branchSuggestions}
                              handleNavigate={handleNavigate}
                            />
                          </OrganizationGuard>
                        }
                      />
                      <Route path="/:orgId/calls" element={
                        <OrganizationGuard>
                          <CallsPage />
                        </OrganizationGuard>
                      } />
                      <Route path="/:orgId/projects/:projectId/calls" element={
                        <OrganizationGuard>
                          <CallsPage />
                        </OrganizationGuard>
                      } />
                      <Route
                        path="/:orgId/projects/:projectId/repository/:repoId/file/*"
                        element={
                          <OrganizationGuard>
                            <FileEditorPage />
                          </OrganizationGuard>
                        }
                      />
                      <Route
                        path="/:orgId/projects/:projectId/repository/:repoId/commit/:commitSha"
                        element={
                          <OrganizationGuard>
                            <CommitDetailsPage />
                          </OrganizationGuard>
                        }
                      />
                      <Route path="/:orgId/projects/:projectId/repository/:repoId">
                        <Route index element={<Navigate to="files" replace />} />
                        <Route
                          path="files"
                          element={
                            <OrganizationGuard>
                              <ProjectRouteWrapperComponent
                                projects={projects}
                                tasks={tasks}
                                setTasks={memoizedSetTasks}
                                taskColumns={taskColumns}
                                setTaskColumns={memoizedSetTaskColumns}
                                assigneeSuggestions={assigneeSuggestions}
                                branchSuggestions={branchSuggestions}
                                handleNavigate={handleNavigate}
                              />
                            </OrganizationGuard>
                          }
                        />
                        <Route
                          path="commits"
                          element={
                            <OrganizationGuard>
                              <ProjectRouteWrapperComponent
                                projects={projects}
                                tasks={tasks}
                                setTasks={memoizedSetTasks}
                                taskColumns={taskColumns}
                                setTaskColumns={memoizedSetTaskColumns}
                                assigneeSuggestions={assigneeSuggestions}
                                branchSuggestions={branchSuggestions}
                                handleNavigate={handleNavigate}
                              />
                            </OrganizationGuard>
                          }
                        />
                        <Route
                          path="branches"
                          element={
                            <OrganizationGuard>
                              <ProjectRouteWrapperComponent
                                projects={projects}
                                tasks={tasks}
                                setTasks={memoizedSetTasks}
                                taskColumns={taskColumns}
                                setTaskColumns={memoizedSetTaskColumns}
                                assigneeSuggestions={assigneeSuggestions}
                                branchSuggestions={branchSuggestions}
                                handleNavigate={handleNavigate}
                              />
                            </OrganizationGuard>
                          }
                        />
                        <Route
                          path="members"
                          element={
                            <OrganizationGuard>
                              <ProjectRouteWrapperComponent
                                projects={projects}
                                tasks={tasks}
                                setTasks={memoizedSetTasks}
                                taskColumns={taskColumns}
                                setTaskColumns={memoizedSetTaskColumns}
                                assigneeSuggestions={assigneeSuggestions}
                                branchSuggestions={branchSuggestions}
                                handleNavigate={handleNavigate}
                              />
                            </OrganizationGuard>
                          }
                        />
                        <Route
                          path="merge-requests"
                          element={
                            <OrganizationGuard>
                              <ProjectRouteWrapperComponent
                                projects={projects}
                                tasks={tasks}
                                setTasks={memoizedSetTasks}
                                taskColumns={taskColumns}
                                setTaskColumns={memoizedSetTaskColumns}
                                assigneeSuggestions={assigneeSuggestions}
                                branchSuggestions={branchSuggestions}
                                handleNavigate={handleNavigate}
                              />
                            </OrganizationGuard>
                          }
                        />
                        <Route
                          path="tasks"
                          element={
                            <OrganizationGuard>
                              <ProjectRouteWrapperComponent
                                projects={projects}
                                tasks={tasks}
                                setTasks={memoizedSetTasks}
                                taskColumns={taskColumns}
                                setTaskColumns={memoizedSetTaskColumns}
                                assigneeSuggestions={assigneeSuggestions}
                                branchSuggestions={branchSuggestions}
                                handleNavigate={handleNavigate}
                              />
                            </OrganizationGuard>
                          }
                        />
                        <Route
                          path="settings"
                          element={
                            <OrganizationGuard>
                              <ProjectRouteWrapperComponent
                                projects={projects}
                                tasks={tasks}
                                setTasks={memoizedSetTasks}
                                taskColumns={taskColumns}
                                setTaskColumns={memoizedSetTaskColumns}
                                assigneeSuggestions={assigneeSuggestions}
                                branchSuggestions={branchSuggestions}
                                handleNavigate={handleNavigate}
                              />
                            </OrganizationGuard>
                          }
                        />
                      </Route>
                      <Route path="/calls" element={<CallsPage />} />
                      <Route
                        path="/call/:callId"
                        element={
                          <div className="flex h-screen">
                            <Sidebar currentPage="calls" onNavigate={handleNavigate} selectedProject={currentProject} currentOrgId={organizationId} />
                            <main className="flex-1 overflow-hidden">
                              <CallPage />
                            </main>
                          </div>
                        }
                      />
                    </Routes>
                  </main>
                </div>
              )
            } />
          </Routes>
        </div>
      </DndProvider>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AccountProvider>
        <AppContent />
      </AccountProvider>
    </AppProvider>
  );
}