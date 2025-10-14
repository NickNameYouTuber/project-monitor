import React, { useEffect, useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './components/sidebar';
import { ProjectsPage } from './components/projects-page';
import { ProjectTasksPage } from './components/project-tasks-page';
import { WhiteboardPage } from './components/whiteboard-page';
import { RepositoryPage } from './components/repository-page';
import { RepositoriesPage } from './components/repositories-page';
import { FileEditorPage } from './components/file-editor-page';
import { CommitDetailsPage } from './components/commit-details-page';
import { AccountPage } from './components/account-page';
import { ProjectSettingsPage } from './components/project-settings-page';
import { CallsPage } from './components/calls-page';
import { AuthPage } from './components/auth-page';
import { setAccessToken } from './api/client';
import CallPage from './features/call/pages/CallPage';
import { Toaster } from './components/ui/sonner';
import { NotificationProvider } from './contexts/NotificationContext';

export type Page = 'projects' | 'tasks' | 'whiteboard' | 'repositories' | 'repository' | 'calls' | 'account' | 'project-settings' | 'merge-request';

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
  onProjectResolved,
}: {
  projects: Project[];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  taskColumns: Column[];
  setTaskColumns: React.Dispatch<React.SetStateAction<Column[]>>;
  assigneeSuggestions: string[];
  branchSuggestions: string[];
  handleNavigate: (page: Page, project?: Project) => void;
  onProjectResolved?: (p: Project) => void;
}) {
  const params = useParams();
  const navigate = useNavigate();
  const [fetchedProject, setFetchedProject] = React.useState<Project | null>(null);
  const p = projects.find(pr => pr.id === params.projectId) || fetchedProject || null;
  const repoId = (params as any).repoId as string | undefined;

  React.useEffect(() => {
    let isCancelled = false;
    if (!params.projectId) return;
    if (projects.find(pr => pr.id === params.projectId)) return;
    (async () => {
      try {
        const { getProject } = await import('./api/projects');
        const dto = await getProject(params.projectId as string);
        if (isCancelled) return;
        const mapped: Project = {
          id: dto.id,
          title: dto.name,
          description: dto.description || '',
          status: dto.status || 'inPlans',
          createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
          color: dto.color || '#6366f1',
        };
        setFetchedProject(mapped);
        // Устанавливаем выбранный проект, чтобы сайдбар и навигация знали о нем
        try {
          // setSelectedProject в верхнем уровне через window.dispatchEvent невозможен; используем URL-навиг.
        } catch {}
      } catch {
        // ignore
      }
    })();
    return () => { isCancelled = true; };
  }, [params.projectId, projects]);
  
  // Сообщаем вверх о выбранном проекте для синхронизации сайдбара/навигации
  React.useEffect(() => {
    if (p && onProjectResolved) {
      onProjectResolved(p);
    }
  }, [p?.id]);
  
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
        navigate(`/projects/${p.id}/repository/${repoId}`);
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
  return <Navigate to={`/projects/${p.id}/tasks`} replace />;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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
  const [assigneeSuggestions] = useState<string[]>([]);

  const [branchSuggestions] = useState<string[]>([]);

  const navigate = useNavigate();
  const handleNavigate = (page: Page, project?: Project) => {
    setCurrentPage(page);
    if (project) {
      setSelectedProject(project);
      navigate(`/projects/${project.id}/${page}`);
      return;
    }
    // Навигация с учетом выбранного проекта
    if (page === 'projects') {
      setSelectedProject(null);
      navigate('/projects');
      return;
    }
    if (page === 'calls' || page === 'account') {
      navigate(`/${page}`);
      return;
    }
    if (page === 'project-settings' && selectedProject) {
      navigate(`/projects/${selectedProject.id}/settings`);
      return;
    }
    if ((page === 'tasks' || page === 'whiteboard' || page === 'repositories' || page === 'repository') && selectedProject) {
      navigate(`/projects/${selectedProject.id}/${page}`);
      return;
    }
    // Если проект не выбран — отправляем на список проектов
    if (page === 'tasks' || page === 'whiteboard' || page === 'repositories' || page === 'repository' || page === 'project-settings') {
      navigate('/projects');
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
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        setAccessToken(token);
        setIsAuthenticated(true);
      }
    } catch {}
  }, []);

  // Загружаем проекты при аутентификации
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const { listProjects } = await import('./api/projects');
        const data = await listProjects();
        const mapped: Project[] = data.map(d => ({
          id: d.id,
          title: d.name,
          description: d.description || '',
          status: d.status || 'inPlans',
          createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
          color: d.color || '#6366f1',
        }));
        setProjects(mapped);
      } catch {}
    })();
  }, [isAuthenticated]);

  const location = useLocation();
  const isStandaloneCall = location.pathname.startsWith('/call/');
  
  // Обновляем currentPage на основе URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/projects') {
      setCurrentPage('projects');
    } else if (path === '/calls') {
      setCurrentPage('calls');
    } else if (path === '/account') {
      setCurrentPage('account');
    } else if (path.includes('/settings')) {
      setCurrentPage('project-settings');
    } else if (path.includes('/repository')) {
      setCurrentPage('repositories');
    } else if (path.includes('/repositories')) {
      setCurrentPage('repositories');
    } else if (path.includes('/tasks')) {
      setCurrentPage('tasks');
    } else if (path.includes('/whiteboard')) {
      setCurrentPage('whiteboard');
    }
  }, [location.pathname]);

  return (
    <NotificationProvider>
      <DndProvider backend={HTML5Backend}>
        <Toaster position="top-right" richColors />
        <div className="dark min-h-screen bg-background text-foreground">
          {!isAuthenticated ? (
            <AuthPage onLogin={() => setIsAuthenticated(true)} />
          ) : (
            <div className="flex h-screen">
              {!isStandaloneCall && (
                <Sidebar currentPage={currentPage} onNavigate={handleNavigate} selectedProject={selectedProject} />
              )}
              <main className={`flex-1 overflow-hidden ${currentPage === 'projects' || isStandaloneCall ? 'w-full' : ''}`}>
              <Routes>
                <Route path="/" element={<Navigate to="/projects" replace />} />
                <Route path="/projects" element={
                  <ProjectsPage
                    projects={projects}
                    setProjects={setProjects}
                    columns={projectColumns}
                    setColumns={setProjectColumns}
                    onProjectSelect={(project) => handleNavigate('tasks', project)}
                  />
                } />
                <Route
                  path="/projects/:projectId/:section"
                  element={
                    <ProjectRouteWrapperComponent
                      projects={projects}
                      tasks={tasks}
                      setTasks={memoizedSetTasks}
                      taskColumns={taskColumns}
                      setTaskColumns={memoizedSetTaskColumns}
                      assigneeSuggestions={assigneeSuggestions}
                      branchSuggestions={branchSuggestions}
                      handleNavigate={handleNavigate}
                      onProjectResolved={setSelectedProject}
                    />
                  }
                />
                <Route path="/repository" element={<RepositoryPage projects={projects} tasks={tasks} selectedProject={selectedProject} />} />
                <Route
                  path="/projects/:projectId/repository/:repoId/file/*"
                  element={<FileEditorPage />}
                />
                <Route
                  path="/projects/:projectId/repository/:repoId/commit/:commitSha"
                  element={<CommitDetailsPage />}
                />
                <Route path="/projects/:projectId/repository/:repoId">
                  <Route index element={<Navigate to="files" replace />} />
                  <Route
                    path="files"
                    element={
                      <ProjectRouteWrapperComponent
                        projects={projects}
                        tasks={tasks}
                        setTasks={memoizedSetTasks}
                        taskColumns={taskColumns}
                        setTaskColumns={memoizedSetTaskColumns}
                        assigneeSuggestions={assigneeSuggestions}
                        branchSuggestions={branchSuggestions}
                        handleNavigate={handleNavigate}
                        onProjectResolved={setSelectedProject}
                      />
                    }
                  />
                  <Route
                    path="commits"
                    element={
                      <ProjectRouteWrapperComponent
                        projects={projects}
                        tasks={tasks}
                        setTasks={memoizedSetTasks}
                        taskColumns={taskColumns}
                        setTaskColumns={memoizedSetTaskColumns}
                        assigneeSuggestions={assigneeSuggestions}
                        branchSuggestions={branchSuggestions}
                        handleNavigate={handleNavigate}
                        onProjectResolved={setSelectedProject}
                      />
                    }
                  />
                  <Route
                    path="branches"
                    element={
                      <ProjectRouteWrapperComponent
                        projects={projects}
                        tasks={tasks}
                        setTasks={memoizedSetTasks}
                        taskColumns={taskColumns}
                        setTaskColumns={memoizedSetTaskColumns}
                        assigneeSuggestions={assigneeSuggestions}
                        branchSuggestions={branchSuggestions}
                        handleNavigate={handleNavigate}
                        onProjectResolved={setSelectedProject}
                      />
                    }
                  />
                  <Route
                    path="members"
                    element={
                      <ProjectRouteWrapperComponent
                        projects={projects}
                        tasks={tasks}
                        setTasks={memoizedSetTasks}
                        taskColumns={taskColumns}
                        setTaskColumns={memoizedSetTaskColumns}
                        assigneeSuggestions={assigneeSuggestions}
                        branchSuggestions={branchSuggestions}
                        handleNavigate={handleNavigate}
                        onProjectResolved={setSelectedProject}
                      />
                    }
                  />
                  <Route
                    path="merge-requests"
                    element={
                      <ProjectRouteWrapperComponent
                        projects={projects}
                        tasks={tasks}
                        setTasks={memoizedSetTasks}
                        taskColumns={taskColumns}
                        setTaskColumns={memoizedSetTaskColumns}
                        assigneeSuggestions={assigneeSuggestions}
                        branchSuggestions={branchSuggestions}
                        handleNavigate={handleNavigate}
                        onProjectResolved={setSelectedProject}
                      />
                    }
                  />
                  <Route
                    path="tasks"
                    element={
                      <ProjectRouteWrapperComponent
                        projects={projects}
                        tasks={tasks}
                        setTasks={memoizedSetTasks}
                        taskColumns={taskColumns}
                        setTaskColumns={memoizedSetTaskColumns}
                        assigneeSuggestions={assigneeSuggestions}
                        branchSuggestions={branchSuggestions}
                        handleNavigate={handleNavigate}
                        onProjectResolved={setSelectedProject}
                      />
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <ProjectRouteWrapperComponent
                        projects={projects}
                        tasks={tasks}
                        setTasks={memoizedSetTasks}
                        taskColumns={taskColumns}
                        setTaskColumns={memoizedSetTaskColumns}
                        assigneeSuggestions={assigneeSuggestions}
                        branchSuggestions={branchSuggestions}
                        handleNavigate={handleNavigate}
                        onProjectResolved={setSelectedProject}
                      />
                    }
                  />
                </Route>
                <Route path="/whiteboard" element={<WhiteboardPage project={selectedProject} />} />
                <Route path="/calls" element={<CallsPage />} />
                <Route 
                  path="/call/:callId" 
                  element={
                    <div className="flex h-screen">
                      <Sidebar currentPage="calls" onNavigate={handleNavigate} selectedProject={selectedProject} />
                      <main className="flex-1 overflow-hidden">
                        <CallPage />
                      </main>
                    </div>
                  } 
                />
                <Route path="/account" element={<AccountPage />} />
                <Route path="*" element={<Navigate to="/projects" replace />} />
              </Routes>
            </main>
          </div>
        )}
      </div>
      </DndProvider>
    </NotificationProvider>
  );
}