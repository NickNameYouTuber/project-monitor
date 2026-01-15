import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GitBranch,
  Folder,
  File,
  Plus,
  Search,
  Settings,
  GitMerge,
  MessageSquare,
  Eye,
  ChevronRight,
  ChevronDown,
  Code,
  History,
  Users,
  Shield,
  Key,
  Globe,
  Lock,
  GitCommit,
  Calendar,
  User
} from 'lucide-react';
import {
  Button, Input, Card, CardContent, CardHeader, CardTitle, Badge,
  Tabs, TabsContent, TabsList, TabsTrigger, Avatar, AvatarFallback,
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Label, Textarea, Switch, ScrollArea, Separator,
  Box, Flex, VStack, Grid, Heading, Text
} from '@nicorp/nui';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LoadingSpinner } from './loading-spinner';
import { MergeRequestPage } from './merge-request-page';
import type { Project, Task } from '../App';
import { listRepositories, createBranch, deleteBranch, updateFile, updateRepository, type RepositoryDto } from '../api/repositories';
import { listFiles, type FileEntry, listCommits, getFileContent } from '../api/repository-content';
import { listMembers, addMember, removeMember, type RepositoryMemberDto } from '../api/repository-members';
import { apiClient } from '../api/client';
import { useNotifications } from '../hooks/useNotifications';
import UserAutocomplete from './calls/UserAutocomplete';
import type { UserDto } from '../api/users';
import { Copy } from 'lucide-react';
import { useRepositoryPermissions } from '../hooks/useRepositoryPermissions';
import { RoleBadge } from './role-badge';
import { useCurrentOrganization } from '../hooks/useAppContext';

interface RepositoryPageProps {
  projects: Project[];
  tasks: Task[];
  initialRepoId?: string;
  defaultTab?: string;
  selectedProject?: Project | null;
}

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  size?: number;
  lastModified?: Date;
  author?: string;
}

interface MergeRequest {
  id: string;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  author: string;
  status: 'open' | 'merged' | 'closed';
  createdAt: Date;
  comments: Comment[];
  changes: {
    additions: number;
    deletions: number;
    files: number;
  };
}

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
}


function FileTreeItem({ node, level = 0 }: { node: FileNode; level?: number }) {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box>
      <Flex
        className={`items-center gap-2 py-1 px-2 hover:bg-accent rounded cursor-pointer`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => node.type === 'folder' && setIsExpanded(!isExpanded)}
      >
        {node.type === 'folder' ? (
          <>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Folder className="w-4 h-4 text-blue-500" />
          </>
        ) : (
          <>
            <Box className="w-4" />
            <File className="w-4 h-4 text-gray-500" />
          </>
        )}
        <Text as="span" className="flex-1">{node.name}</Text>
        {node.type === 'file' && node.size && (
          <Text as="span" size="xs" variant="muted">
            {formatFileSize(node.size)}
          </Text>
        )}
      </Flex>

      {node.type === 'folder' && isExpanded && node.children && (
        <Box>
          {node.children.map((child) => (
            <FileTreeItem key={child.id} node={child} level={level + 1} />
          ))}
        </Box>
      )}
    </Box>
  );
}

function MergeRequestCard({ mr, onViewMR }: { mr: MergeRequest; onViewMR: (branch: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');

  const statusColors = {
    open: 'bg-green-100 text-green-800',
    merged: 'bg-blue-100 text-blue-800',
    closed: 'bg-gray-100 text-gray-800'
  };

  const addComment = () => {
    if (newComment.trim()) {
      // In real app, this would make an API call
      console.log('Adding comment:', newComment);
      setNewComment('');
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <Flex className="items-start justify-between mb-3">
          <Box className="flex-1">
            <Flex className="items-center gap-2 mb-2">
              <GitMerge className="w-4 h-4" />
              <Heading level={4} className="font-medium">{mr.title}</Heading>
              <Badge className={statusColors[mr.status]}>
                {mr.status}
              </Badge>
            </Flex>
            <Text size="sm" variant="muted" className="mb-2">{mr.description}</Text>
            <Flex className="items-center gap-4 text-xs text-muted-foreground">
              <Text as="span">{mr.sourceBranch} → {mr.targetBranch}</Text>
              <Text as="span">by {mr.author}</Text>
              <Text as="span">{mr.createdAt.toLocaleDateString()}</Text>
              <Text as="span" className="text-green-600">+{mr.changes.additions}</Text>
              <Text as="span" className="text-red-600">-{mr.changes.deletions}</Text>
              <Text as="span">{mr.changes.files} files</Text>
            </Flex>
          </Box>
          <Flex className="items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onViewMR(mr.sourceBranch)}>
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            {mr.status === 'open' && (
              <Button size="sm">
                Merge
              </Button>
            )}
          </Flex>
        </Flex>

        {isExpanded && (
          <Box className="border-t pt-4">
            <VStack className="space-y-4">
              <Box>
                <Heading level={5} className="font-medium mb-2">Comments ({mr.comments.length})</Heading>
                <VStack className="space-y-2">
                  {mr.comments.map((comment) => (
                    <Box key={comment.id} className="bg-muted p-3 rounded">
                      <Flex className="items-center gap-2 mb-1">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {comment.author.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <Text as="span" weight="medium" size="sm">{comment.author}</Text>
                        <Text as="span" size="xs" variant="muted">
                          {comment.createdAt.toLocaleString()}
                        </Text>
                      </Flex>
                      <Text size="sm">{comment.content}</Text>
                    </Box>
                  ))}
                </VStack>
              </Box>

              {mr.status === 'open' && (
                <Flex className="gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addComment()}
                  />
                  <Button size="sm" onClick={addComment}>
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </Flex>
              )}
            </VStack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function RepositorySettings() {
  const [settings, setSettings] = useState({
    visibility: 'private',
    allowMergeRequests: true,
    requireReviews: true,
    autoDeleteBranches: false,
    protectMain: true
  });

  return (
    <VStack className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Repository Visibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.visibility}
            onValueChange={(value) => setSettings(prev => ({ ...prev, visibility: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">
                <Flex className="items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Private
                </Flex>
              </SelectItem>
              <SelectItem value="public">
                <Flex className="items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Public
                </Flex>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Branch Protection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Flex className="items-center justify-between">
            <Box>
              <Label>Protect main branch</Label>
              <Text size="sm" variant="muted">Prevent direct pushes to main branch</Text>
            </Box>
            <Switch
              checked={settings.protectMain}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, protectMain: checked }))}
            />
          </Flex>

          <Flex className="items-center justify-between">
            <Box>
              <Label>Require pull request reviews</Label>
              <Text size="sm" variant="muted">Require at least one review before merging</Text>
            </Box>
            <Switch
              checked={settings.requireReviews}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requireReviews: checked }))}
            />
          </Flex>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5" />
            Merge Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Flex className="items-center justify-between">
            <Box>
              <Label>Allow merge requests</Label>
              <Text size="sm" variant="muted">Enable merge request functionality</Text>
            </Box>
            <Switch
              checked={settings.allowMergeRequests}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allowMergeRequests: checked }))}
            />
          </Flex>

          <Flex className="items-center justify-between">
            <Box>
              <Label>Auto-delete merged branches</Label>
              <Text size="sm" variant="muted">Automatically delete branches after merge</Text>
            </Box>
            <Switch
              checked={settings.autoDeleteBranches}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoDeleteBranches: checked }))}
            />
          </Flex>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Collaborators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VStack className="space-y-3">
            {['John Doe', 'Jane Smith', 'Mike Johnson'].map((collaborator) => (
              <Flex key={collaborator} className="items-center justify-between">
                <Flex className="items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      {collaborator.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <Text as="span">{collaborator}</Text>
                </Flex>
                <Badge variant="secondary">Admin</Badge>
              </Flex>
            ))}
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Collaborator
            </Button>
          </VStack>
        </CardContent>
      </Card>
    </VStack>
  );
}

export function RepositoryPage({ projects, tasks, initialRepoId, defaultTab = 'files', selectedProject: propSelectedProject }: RepositoryPageProps) {
  const { organizationId } = useCurrentOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedProject, setSelectedProject] = useState<Project | null>(propSelectedProject || null);
  const [repositories, setRepositories] = useState<RepositoryDto[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingMR, setViewingMR] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);

  const repoPermissions = useRepositoryPermissions(selectedRepoId || undefined);

  const [members, setMembers] = useState<RepositoryMemberDto[]>([]);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserDto[]>([]);
  const [newMemberRole, setNewMemberRole] = useState('DEVELOPER');

  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);

  const [isNewFileOpen, setIsNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const [isCreateBranchOpen, setIsCreateBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchFrom, setNewBranchFrom] = useState('');

  const { showSuccess, showError } = useNotifications();

  const [repoSettings, setRepoSettings] = useState({
    name: '',
    description: '',
    visibility: 'private',
    default_branch: 'master'
  });
  const [currentPath, setCurrentPath] = useState<string>('');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getFileIcon = (fileName: string | undefined) => {
    if (!fileName) return 'text-gray-500';
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      'js': 'text-yellow-500',
      'ts': 'text-blue-500',
      'tsx': 'text-blue-400',
      'jsx': 'text-yellow-400',
      'json': 'text-green-500',
      'md': 'text-gray-400',
      'css': 'text-pink-500',
      'html': 'text-orange-500',
      'py': 'text-blue-600',
      'java': 'text-red-500',
      'xml': 'text-orange-400',
      'yml': 'text-purple-500',
      'yaml': 'text-purple-500',
    };
    return iconMap[ext || ''] || 'text-gray-500';
  };

  const loadMembers = async () => {
    if (!selectedRepoId) return;
    try {
      const m = await listMembers(selectedRepoId);
      setMembers(m);
    } catch { }
  };

  const handleAddMember = async () => {
    if (!selectedRepoId || selectedUsers.length === 0) return;
    try {
      for (const user of selectedUsers) {
        await addMember(selectedRepoId, user.id, newMemberRole);
      }
      showSuccess('Участники добавлены');
      setIsAddMemberOpen(false);
      setSelectedUsers([]);
      await loadMembers();
    } catch {
      showError('Ошибка при добавлении участников');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedRepoId) return;
    try {
      await removeMember(selectedRepoId, memberId);
      showSuccess('Участник удалён');
      await loadMembers();
    } catch {
      showError('Ошибка при удалении участника');
    }
  };

  const handleEditFile = (path: string) => {
    if (!selectedRepoId || !selectedProject || !organizationId) return;
    navigate(`/${organizationId}/projects/${selectedProject.id}/repository/${selectedRepoId}/file/${encodeURIComponent(path)}`);
  };

  const handleCreateFile = async () => {
    if (!selectedRepoId || !selectedBranch || !newFileName.trim()) return;

    const fullPath = currentPath
      ? `${currentPath}/${newFileName}`
      : newFileName;

    try {
      await updateFile(selectedRepoId, selectedBranch, fullPath, '', `Create ${newFileName}`);
      showSuccess('Файл создан');
      setIsNewFileOpen(false);
      setNewFileName('');

      const fs = await listFiles(selectedRepoId, selectedBranch, currentPath || undefined);
      setEntries(fs);
    } catch {
      showError('Ошибка при создании файла');
    }
  };

  const handleCreateBranch = async () => {
    if (!selectedRepoId || !newBranchName) return;
    try {
      await createBranch(selectedRepoId, newBranchName, newBranchFrom || selectedBranch);
      showSuccess('Ветка создана');
      setIsCreateBranchOpen(false);
      setNewBranchName('');
      const { getBranches } = await import('../api/repositories');
      const brs = await getBranches(selectedRepoId);
      setBranches(brs);
    } catch {
      showError('Ошибка при создании ветки');
    }
  };

  const handleDeleteBranch = async (branchName: string) => {
    if (!selectedRepoId || !window.confirm(`Удалить ветку ${branchName}?`)) return;
    try {
      await deleteBranch(selectedRepoId, branchName);
      showSuccess('Ветка удалена');
      const { getBranches } = await import('../api/repositories');
      const brs = await getBranches(selectedRepoId);
      setBranches(brs);
    } catch {
      showError('Ошибка при удалении ветки');
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedRepoId) return;
    try {
      await updateRepository(selectedRepoId, repoSettings);
      showSuccess('Настройки сохранены');
    } catch {
      showError('Ошибка при сохранении настроек');
    }
  };

  // Load repositories and find project by initialRepoId
  useEffect(() => {
    (async () => {
      if (!initialRepoId || projects.length === 0) return;

      try {
        setIsLoading(true);
        // Try to find which project contains this repository
        for (const project of projects) {
          const repos = await listRepositories({ project_id: project.id });
          const targetRepo = repos.find(r => r.id === initialRepoId);
          if (targetRepo) {
            setSelectedProject(project);
            setRepositories(repos);
            setSelectedRepoId(initialRepoId);
            return;
          }
        }
        // If not found, set first project as fallback
        setSelectedProject(projects[0]);
        const repos = await listRepositories({ project_id: projects[0].id });
        setRepositories(repos);
        if (repos.length > 0) {
          setSelectedRepoId(repos[0].id);
        }
      } catch { }
      finally {
        setIsLoading(false);
      }
    })();
  }, [initialRepoId, projects]);

  useEffect(() => {
    (async () => {
      if (!selectedRepoId) return;
      try {
        // fetch branches and default
        // Default branch
        const { getDefaultBranch, getBranches } = await import('../api/repositories');
        const def = await getDefaultBranch(selectedRepoId).catch(() => ({ default: 'main' }));
        const brs = await getBranches(selectedRepoId).catch(() => []);
        setBranches(brs && brs.length ? brs : (def.default ? [def.default] : ['main']));
        setSelectedBranch(def.default || brs[0] || 'main');
        setCurrentPath('');
      } catch (error) {
        console.error('Ошибка загрузки веток репозитория:', error);
        setBranches(['main']);
        setSelectedBranch('main');
        setCurrentPath('');
      }
    })();
  }, [selectedRepoId]);

  useEffect(() => {
    (async () => {
      if (!selectedRepoId || !selectedBranch) return;
      try {
        const [fs, cs] = await Promise.all([
          listFiles(selectedRepoId, selectedBranch, currentPath || undefined).catch(() => []),
          listCommits(selectedRepoId, selectedBranch).catch(() => [])
        ]);
        setEntries(fs || []);
        setCommits(cs || []);

        // Load README if present and in root
        if (!currentPath) {
          const readmeFile = fs?.find(f => f.name.toLowerCase() === 'readme.md');
          if (readmeFile) {
            try {
              const content = await getFileContent(selectedRepoId, selectedBranch, readmeFile.path);
              // Decode base64 if needed (assuming API returns raw or handled, check API)
              // The SDK/API usually returns raw text unless specified otherwise.
              // If it's pure text from API, we use it directly.
              // If your API returns base64, decode it: atob(content)
              // Assuming API returns object { content: "...", encoding: "base64" } or just string
              // Based on getFileContent usage in other places, let's assume it returns string.
              // Actually check logic: `getFileContent` usually returns blob.
              // Let's assume text for now or verify API.
              // Safe approach: check typeof or base64 heuristic.
              setReadmeContent(typeof content === 'string' ? content : JSON.stringify(content));
            } catch (e) {
              console.error('Failed to load README', e);
            }
          } else {
            setReadmeContent(null);
          }
        } else {
          setReadmeContent(null);
        }

      } catch (error) {
        console.error('Ошибка загрузки данных репозитория:', error);
        setEntries([]);
        setCommits([]);
        setReadmeContent(null);
      }
    })();
  }, [selectedRepoId, selectedBranch, currentPath]);

  useEffect(() => {
    if (selectedRepoId) {
      loadMembers();
      const repo = repositories.find(r => r.id === selectedRepoId);
      if (repo) {
        setRepoSettings({
          name: repo.name,
          description: repo.description || '',
          visibility: repo.visibility || 'private',
          default_branch: repo.default_branch || 'main'
        });
      }
    }
  }, [selectedRepoId, repositories]);

  const selectedRepo = repositories.find(r => r.id === selectedRepoId);

  // Вычислить активный таб из URL
  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/files')) return 'files';
    if (path.includes('/commits')) return 'commits';
    if (path.includes('/branches')) return 'branches';
    if (path.includes('/members')) return 'members';
    if (path.includes('/merge-requests')) return 'merge-requests';
    if (path.includes('/tasks')) return 'tasks';
    if (path.includes('/settings')) return 'settings';
    return defaultTab;
  }, [location.pathname, defaultTab]);

  const handleTabChange = (value: string) => {
    if (organizationId && selectedProject) {
      navigate(`/${organizationId}/projects/${selectedProject.id}/repository/${selectedRepoId}/${value}`);
    }
  };

  useEffect(() => {
    console.log('[LINKED TASKS DEBUG] Effect triggered. activeTab:', activeTab, 'selectedRepoId:', selectedRepoId);

    if (!selectedRepoId) {
      console.log('[LINKED TASKS DEBUG] No selectedRepoId, skipping');
      setLinkedTasks([]);
      return;
    }

    if (activeTab !== 'tasks') {
      console.log('[LINKED TASKS DEBUG] Not on tasks tab, skipping. Current tab:', activeTab);
      return;
    }

    console.log('[LINKED TASKS DEBUG] ✅ Loading linked tasks for repository:', selectedRepoId);

    (async () => {
      try {
        const response = await apiClient.get(`/repositories/${selectedRepoId}/tasks`);
        console.log('[LINKED TASKS DEBUG] ✅ Response received:', response);
        const data = response.data;
        console.log('[LINKED TASKS DEBUG] ✅ Data:', data);
        const mappedTasks: Task[] = data.map((dto: any) => ({
          id: dto.id,
          projectId: dto.project_id ?? dto.projectId,
          title: dto.title,
          description: dto.description || '',
          status: dto.column_id ?? dto.columnId,
          priority: 'medium' as const,
          createdAt: dto.created_at ? new Date(dto.created_at) : new Date(),
          dueDate: dto.due_date ? new Date(dto.due_date) : undefined,
          repository_id: dto.repository_id,
          repositoryBranch: dto.repository_branch,
          repositoryInfo: dto.repository_info ? {
            repositoryId: dto.repository_info.repository_id,
            repositoryName: dto.repository_info.repository_name,
            branch: dto.repository_info.branch
          } : undefined,
        }));
        console.log('[LINKED TASKS DEBUG] ✅ Mapped tasks:', mappedTasks);
        setLinkedTasks(mappedTasks);
      } catch (error) {
        console.error('[LINKED TASKS DEBUG] ❌ Failed to load linked tasks:', error);
        setLinkedTasks([]);
      }
    })();
  }, [selectedRepoId, activeTab]);

  const handleTaskClick = (task: Task) => {
    if (!selectedProject?.id || !organizationId) return;
    navigate(`/${organizationId}/projects/${selectedProject.id}/tasks?highlightTask=${task.id}`);
  };

  if (isLoading) {
    return <LoadingSpinner
      stages={['Locate Project', 'Connect Repo', 'Fetch Content', 'Ready']}
    />;
  }

  // Fallback if no projects found and loading finished
  if (projects.length === 0 && !isLoading) {
    return (
      <Flex className="h-full items-center justify-center p-6 text-center">
        <Box>
          <Heading level={2}>Project Not Found</Heading>
          <Text variant="muted" className="mt-2">Could not locate the project for this repository.</Text>
          <Button className="mt-4" onClick={() => navigate('/')}>Go Home</Button>
        </Box>
      </Flex>
    );
  }

  if (viewingMR) {
    return (
      <MergeRequestPage
        branch={viewingMR}
        onBack={() => setViewingMR(null)}
      />
    );
  }

  return (
    <Flex className="h-full flex-col">
      <Box className="border-b border-border p-6">
        <Flex className="items-center justify-between mb-4">
          <Box className="flex-1">
            <Flex className="items-center gap-3">
              <Heading level={1}>Repository</Heading>
              {selectedRepoId && repoPermissions.role && (
                <RoleBadge role={repoPermissions.role} type="repository" />
              )}
            </Flex>
            <Text variant="muted">Manage your project repositories and code</Text>
          </Box>
        </Flex>
      </Box>

      <Box className="flex-1 p-6 overflow-auto">
        {/* Если репозиторий не выбран — показываем список */}
        {!selectedRepoId ? (
          <Card>
            <CardHeader>
              <CardTitle>Repositories</CardTitle>
            </CardHeader>
            <CardContent>
              {repositories.length === 0 ? (
                <Text size="sm" variant="muted">No repositories yet.</Text>
              ) : (
                <VStack className="space-y-2">
                  {repositories.map(repo => (
                    <Flex key={repo.id} className="items-center justify-between p-2 hover:bg-accent rounded">
                      <Flex className="items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        <Text as="span">{repo.name}</Text>
                      </Flex>
                      <Button size="sm" variant="outline" onClick={() => setSelectedRepoId(repo.id)}>Open</Button>
                    </Flex>
                  ))}
                </VStack>
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full">
            <TabsList>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="commits">Commits</TabsTrigger>
              <TabsTrigger value="branches">Branches</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="merge-requests">Merge Requests</TabsTrigger>
              <TabsTrigger value="tasks">Linked Tasks</TabsTrigger>
              {repoPermissions.canManageSettings && (
                <TabsTrigger value="settings">Settings</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="files" className="space-y-4">
              <Flex className="items-center gap-4 mb-4">
                <Flex className="items-center gap-2">
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(branch => (
                        <SelectItem key={branch} value={branch}>
                          <Flex className="items-center gap-2">
                            <GitBranch className="w-4 h-4" />
                            {branch}
                          </Flex>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Flex>

                <Box className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </Box>
                {repoPermissions.canEditFiles && (
                  <Dialog open={isNewFileOpen} onOpenChange={setIsNewFileOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        New File
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Создать новый файл</DialogTitle>
                      </DialogHeader>
                      <VStack className="space-y-4">
                        <Box>
                          <Label>Имя файла</Label>
                          <Input
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            placeholder="index.js"
                          />
                          {currentPath && (
                            <Text size="xs" variant="muted" className="mt-1">
                              Будет создан в: {currentPath}/
                            </Text>
                          )}
                        </Box>
                        <Flex className="justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsNewFileOpen(false)}>
                            Отмена
                          </Button>
                          <Button onClick={handleCreateFile} disabled={!newFileName.trim()}>
                            Создать
                          </Button>
                        </Flex>
                      </VStack>
                    </DialogContent>
                  </Dialog>
                )}
              </Flex>

              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-96">
                    <Box className="p-4">
                      <Box className="text-xs text-muted-foreground px-2 mb-2">
                        <button
                          onClick={() => setCurrentPath('')}
                          className="hover:underline hover:text-foreground transition-colors"
                        >
                          root
                        </button>
                        {currentPath && currentPath.split('/').filter(Boolean).map((seg, idx, arr) => (
                          <Text as="span" key={idx}>
                            {' / '}
                            <button
                              onClick={() => setCurrentPath(arr.slice(0, idx + 1).join('/'))}
                              className="hover:underline hover:text-foreground transition-colors"
                            >
                              {seg}
                            </button>
                          </Text>
                        ))}
                      </Box>
                      {entries
                        .filter(e => !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((e, i) => (
                          <Flex key={`${e.path}-${i}`} className={`items-center gap-2 py-1 px-2 hover:bg-accent rounded cursor-pointer`}
                            onClick={() => {
                              if (e.type === 'tree') {
                                setCurrentPath((currentPath ? currentPath + '/' : '') + e.name);
                              } else {
                                handleEditFile(e.path);
                              }
                            }}>
                            {e.type === 'tree' ? (
                              <Folder className="w-4 h-4 text-blue-500" />
                            ) : (
                              <File className={`w-4 h-4 ${getFileIcon(e.name)}`} />
                            )}
                            <Text as="span" className="flex-1">{e.name || 'Unnamed'}</Text>
                            {e.type === 'blob' && (
                              <>
                                {e.name && e.name.includes('.') && (
                                  <Text as="span" className="text-xs text-muted-foreground mr-2">
                                    .{e.name.split('.').pop()}
                                  </Text>
                                )}
                                {e.size && (
                                  <Text as="span" size="xs" variant="muted">{e.size} B</Text>
                                )}
                              </>
                            )}
                          </Flex>
                        ))}
                    </Box>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* README Display */}
              {readmeContent && (
                <Card>
                  <CardHeader className="py-3 border-b">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <File className="w-4 h-4" />
                      README.md
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <article className="prose dark:prose-invert max-w-none prose-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {readmeContent}
                      </ReactMarkdown>
                    </article>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="commits" className="space-y-4">
              <VStack className="space-y-3">
                {commits.map((commit: any, idx) => (
                  <Card
                    key={commit.id || commit.sha || idx}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      if (organizationId && selectedProject) {
                        navigate(`/${organizationId}/projects/${selectedProject.id}/repository/${selectedRepoId}/commit/${commit.sha || commit.id}`);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <Flex className="items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {(commit.author || commit.authorName || 'U')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <Box className="flex-1">
                          <Text weight="medium">{commit.message || commit.fullMessage || 'Commit'}</Text>
                          <Flex className="items-center gap-4 text-sm text-muted-foreground">
                            <Text as="span">{commit.author || commit.authorName || ''}</Text>
                            <Text as="span">{commit.date ? new Date(commit.date).toLocaleString() : ''}</Text>
                            <Box as="code" className="px-2 py-1 bg-muted rounded text-xs">
                              {(commit.id || commit.sha || '').toString().substring(0, 7)}
                            </Box>
                          </Flex>
                        </Box>
                      </Flex>
                    </CardContent>
                  </Card>
                ))}
                {commits.length === 0 && (
                  <Text size="sm" variant="muted">No commits.</Text>
                )}
              </VStack>
            </TabsContent>

            <TabsContent value="branches" className="space-y-4">
              <Flex className="items-center justify-between mb-4">
                <Heading level={3} className="text-lg font-medium">Ветки</Heading>
                {repoPermissions.canCreateBranch && (
                  <Dialog open={isCreateBranchOpen} onOpenChange={setIsCreateBranchOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Создать ветку
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Создать новую ветку</DialogTitle>
                      </DialogHeader>
                      <VStack className="space-y-4">
                        <Box>
                          <Label>Название ветки</Label>
                          <Input
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            placeholder="feature/my-feature"
                          />
                        </Box>
                        <Box>
                          <Label>Создать из</Label>
                          <Select value={newBranchFrom} onValueChange={setNewBranchFrom}>
                            <SelectTrigger>
                              <SelectValue placeholder={selectedBranch} />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Box>
                        <Flex className="justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsCreateBranchOpen(false)}>Отмена</Button>
                          <Button onClick={handleCreateBranch}>Создать</Button>
                        </Flex>
                      </VStack>
                    </DialogContent>
                  </Dialog>
                )}
              </Flex>
              <VStack className="space-y-2">
                {branches.map(branch => (
                  <Card key={branch}>
                    <CardContent className="p-4">
                      <Flex className="items-center justify-between">
                        <Flex className="items-center gap-2">
                          <GitBranch className="w-4 h-4" />
                          <Text as="span" weight="medium">{branch}</Text>
                          {branch === selectedBranch && (
                            <Badge variant="secondary">Current</Badge>
                          )}
                        </Flex>
                        {branch !== selectedBranch && repoPermissions.canDeleteBranch && (
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteBranch(branch)}>
                            Удалить
                          </Button>
                        )}
                      </Flex>
                    </CardContent>
                  </Card>
                ))}
              </VStack>
            </TabsContent>

            <TabsContent value="members" className="space-y-4">
              <Flex className="items-center justify-between mb-4">
                <Heading level={3} className="text-lg font-medium">Участники</Heading>
                {repoPermissions.canManageMembers && (
                  <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Добавить участника
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Добавить участника</DialogTitle>
                      </DialogHeader>
                      <VStack className="space-y-4">
                        <Box>
                          <UserAutocomplete
                            selectedUsers={selectedUsers}
                            onUsersChange={setSelectedUsers}
                            label="Выберите пользователей"
                            projectId={selectedProject?.id}
                          />
                        </Box>
                        <Box>
                          <Label>Роль</Label>
                          <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OWNER">Owner</SelectItem>
                              <SelectItem value="MAINTAINER">Maintainer</SelectItem>
                              <SelectItem value="DEVELOPER">Developer</SelectItem>
                              <SelectItem value="REPORTER">Reporter</SelectItem>
                              <SelectItem value="VIEWER">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </Box>
                        <Flex className="justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>Отмена</Button>
                          <Button onClick={handleAddMember} disabled={selectedUsers.length === 0}>Добавить</Button>
                        </Flex>
                      </VStack>
                    </DialogContent>
                  </Dialog>
                )}
              </Flex>
              <VStack className="space-y-2">
                {members.length === 0 ? (
                  <Card>
                    <CardContent className="p-4 text-center text-muted-foreground">
                      Нет участников
                    </CardContent>
                  </Card>
                ) : (
                  members.map(member => (
                    <Card key={member.id}>
                      <CardContent className="p-4">
                        <Flex className="items-center justify-between">
                          <Flex className="items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback>
                                {(member.user?.username || 'U').substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <Box>
                              <Text weight="medium">{member.user?.username || member.user_id}</Text>
                              <RoleBadge role={member.role} type="repository" variant="secondary" />
                            </Box>
                          </Flex>
                          {repoPermissions.canManageMembers && (
                            <Button size="sm" variant="ghost" onClick={() => handleRemoveMember(member.id)}>
                              Удалить
                            </Button>
                          )}
                        </Flex>
                      </CardContent>
                    </Card>
                  ))
                )}
              </VStack>
            </TabsContent>

            <TabsContent value="merge-requests" className="space-y-4">
              <Flex className="items-center justify-between">
                <Heading level={3} className="text-lg font-medium">Merge Requests</Heading>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Merge Request
                </Button>
              </Flex>

              <VStack className="space-y-4">
                {[].map((mr) => (
                  <MergeRequestCard key={mr.id} mr={mr} onViewMR={setViewingMR} />
                ))}
              </VStack>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <Flex className="items-center justify-between">
                <Heading level={3} className="text-lg font-medium">Linked Tasks</Heading>
                <Badge variant="secondary">{linkedTasks.length} tasks</Badge>
              </Flex>

              <VStack className="space-y-3">
                {linkedTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleTaskClick(task)}
                  >
                    <CardContent className="p-4">
                      <Flex className="items-center gap-3">
                        <Badge variant="outline">{task.priority}</Badge>
                        <Box className="flex-1">
                          <Text weight="medium">{task.title}</Text>
                          <Text size="sm" variant="muted">{task.description}</Text>
                        </Box>
                        {task.repositoryInfo && (
                          <Flex className="items-center gap-2 text-sm text-muted-foreground">
                            <GitBranch className="w-4 h-4" />
                            <Box as="code" className="px-2 py-1 bg-muted rounded text-xs">
                              {task.repositoryInfo.branch}
                            </Box>
                          </Flex>
                        )}
                      </Flex>
                    </CardContent>
                  </Card>
                ))}

                {linkedTasks.length === 0 && (
                  <Flex className="flex-col items-center py-8 text-center">
                    <Code className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <Heading level={3} className="font-medium mb-2">No linked tasks</Heading>
                    <Text size="sm" variant="muted">
                      Tasks with repository branches will appear here.
                    </Text>
                  </Flex>
                )}
              </VStack>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Настройки репозитория</CardTitle>
                </CardHeader>
                <CardContent>
                  <VStack className="space-y-4">
                    <Box>
                      <Label>Название</Label>
                      <Input
                        value={repoSettings.name}
                        onChange={(e) => setRepoSettings(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </Box>
                    <Box>
                      <Label>Описание</Label>
                      <Textarea
                        value={repoSettings.description}
                        onChange={(e) => setRepoSettings(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </Box>
                    <Grid className="grid-cols-2 gap-4">
                      <Box>
                        <Label>Default Branch</Label>
                        <Input
                          value={repoSettings.default_branch}
                          onChange={(e) => setRepoSettings(prev => ({ ...prev, default_branch: e.target.value }))}
                        />
                      </Box>
                      <Box>
                        <Label>Видимость</Label>
                        <Select value={repoSettings.visibility} onValueChange={(v) => setRepoSettings(prev => ({ ...prev, visibility: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="public">Public</SelectItem>
                          </SelectContent>
                        </Select>
                      </Box>
                    </Grid>
                    <Flex className="justify-end">
                      <Button onClick={handleSaveSettings}>Сохранить изменения</Button>
                    </Flex>
                  </VStack>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Клонирование репозитория
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VStack className="space-y-4">
                    <Box>
                      <Label>Clone URL</Label>
                      <Flex className="gap-2 mt-2">
                        <Input
                          value={`https://nit.nicorp.tech/git/${selectedRepoId}.git`}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(`git clone https://nit.nicorp.tech/git/${selectedRepoId}.git`);
                            showSuccess('Команда скопирована');
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </Flex>
                      <Text size="sm" variant="muted" className="mt-2">
                        Используйте эту команду для клонирования репозитория локально
                      </Text>
                    </Box>
                    <Box className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <Text size="sm" weight="medium">Git команды:</Text>
                      <Box as="code" className="text-xs block bg-background p-2 rounded">
                        git clone https://nit.nicorp.tech/git/{selectedRepoId}.git
                      </Box>
                      <Box as="code" className="text-xs block bg-background p-2 rounded mt-1">
                        git remote add origin https://nit.nicorp.tech/git/{selectedRepoId}.git
                      </Box>
                    </Box>
                  </VStack>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </Box>
    </Flex>
  );
}