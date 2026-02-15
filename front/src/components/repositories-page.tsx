import React, { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, Button, Input,
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
  Tabs, TabsContent, TabsList, TabsTrigger, Label, Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Box, Flex, VStack, Heading, Text, Badge
} from '@nicorp/nui';
import { GitBranch, Plus, Search, Lock, Calendar, FolderGit2 } from 'lucide-react';
import { LoadingSpinner } from './loading-spinner';
import { PageHeader } from './shared/page-header';
import { EmptyState } from './shared/empty-state';
import type { Project } from '../App';
import { listRepositories, createRepository, cloneRepository, type RepositoryDto } from '../api/repositories';
import { useNotifications } from '../hooks/useNotifications';

interface RepositoriesPageProps {
  project: Project | null;
  onOpenRepository: (repoId: string) => void;
}

export function RepositoriesPage({ project, onOpenRepository }: RepositoriesPageProps) {
  const { showSuccess, showError } = useNotifications();
  const [repositories, setRepositories] = useState<RepositoryDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createType, setCreateType] = useState<'empty' | 'clone'>('empty');
  const [newRepo, setNewRepo] = useState({
    name: '',
    description: '',
    default_branch: 'master',
    visibility: 'private',
    url: '',
    auth_token: ''
  });

  useEffect(() => {
    loadRepositories();
  }, [project?.id]);

  const loadRepositories = async () => {
    if (!project) return;
    try {
      setIsLoading(true);
      const repos = await listRepositories({ project_id: project.id });
      setRepositories(repos);
    } catch { }
    finally {
      setIsLoading(false);
    }
  };

  const handleCreateRepository = async () => {
    if (!newRepo.name.trim()) {
      showError('Ошибка', 'Введите название репозитория');
      return;
    }

    setIsCreating(true);
    try {
      if (createType === 'empty') {
        await createRepository({
          name: newRepo.name,
          description: newRepo.description || undefined,
          default_branch: newRepo.default_branch || undefined,
          visibility: newRepo.visibility || undefined,
          project_id: project?.id ? String(project.id) : undefined
        });
        showSuccess('Репозиторий создан');
      } else {
        if (!newRepo.url.trim()) {
          showError('Введите URL репозитория');
          return;
        }
        await cloneRepository({
          url: newRepo.url,
          name: newRepo.name,
          description: newRepo.description || undefined,
          default_branch: newRepo.default_branch || undefined,
          visibility: newRepo.visibility || undefined,
          project_id: project?.id ? String(project.id) : undefined,
          auth_token: newRepo.auth_token || undefined
        });
        showSuccess('Репозиторий клонирован');
      }
      setIsDialogOpen(false);
      setNewRepo({
        name: '',
        description: '',
        default_branch: 'master',
        visibility: 'private',
        url: '',
        auth_token: ''
      });
      await loadRepositories();
    } catch (error: any) {
      console.error('Ошибка при создании репозитория:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Ошибка при создании репозитория';
      showError('Ошибка', errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner
      stages={['Connect Git', 'Fetch Repos', 'Index Data', 'Ready']}
    />;
  }

  return (
    <Flex className="h-full flex-col">
      <PageHeader
        title="Repositories"
        subtitle="Select a repository to view details"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Новый репозиторий
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Создать репозиторий</DialogTitle>
                  <DialogDescription>
                    Создайте новый пустой репозиторий или клонируйте существующий
                  </DialogDescription>
                </DialogHeader>

                <Tabs value={createType} onValueChange={(v) => setCreateType(v as 'empty' | 'clone')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="empty">Создать пустой</TabsTrigger>
                    <TabsTrigger value="clone">Клонировать из URL</TabsTrigger>
                  </TabsList>

                  <TabsContent value="empty" className="space-y-4">
                    <Box>
                      <Label htmlFor="name">Название</Label>
                      <Input
                        id="name"
                        value={newRepo.name}
                        onChange={(e) => setNewRepo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="my-repository"
                      />
                    </Box>

                    <Box>
                      <Label htmlFor="description">Описание</Label>
                      <Textarea
                        id="description"
                        value={newRepo.description}
                        onChange={(e) => setNewRepo(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Описание репозитория"
                        rows={3}
                      />
                    </Box>

                    <Box className="grid grid-cols-2 gap-4">
                      <Box>
                        <Label htmlFor="branch">Default Branch</Label>
                        <Input
                          id="branch"
                          value={newRepo.default_branch}
                          onChange={(e) => setNewRepo(prev => ({ ...prev, default_branch: e.target.value }))}
                          placeholder="master"
                        />
                      </Box>

                      <Box>
                        <Label htmlFor="visibility">Видимость</Label>
                        <Flex className="items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/50">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                          <Text size="sm">Private</Text>
                        </Flex>
                        <Text size="xs" variant="muted" className="mt-1">Все репозитории создаются как приватные</Text>
                      </Box>
                    </Box>
                  </TabsContent>

                  <TabsContent value="clone" className="space-y-4">
                    <Box>
                      <Label htmlFor="url">URL репозитория</Label>
                      <Input
                        id="url"
                        value={newRepo.url}
                        onChange={(e) => setNewRepo(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://github.com/user/repo.git"
                      />
                    </Box>

                    <Box>
                      <Label htmlFor="clone-name">Название</Label>
                      <Input
                        id="clone-name"
                        value={newRepo.name}
                        onChange={(e) => setNewRepo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="my-repository"
                      />
                    </Box>

                    <Box>
                      <Label htmlFor="clone-description">Описание</Label>
                      <Textarea
                        id="clone-description"
                        value={newRepo.description}
                        onChange={(e) => setNewRepo(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Описание репозитория"
                        rows={3}
                      />
                    </Box>

                    <Box>
                      <Label htmlFor="auth-token">Токен авторизации (опционально)</Label>
                      <Input
                        id="auth-token"
                        type="password"
                        value={newRepo.auth_token}
                        onChange={(e) => setNewRepo(prev => ({ ...prev, auth_token: e.target.value }))}
                        placeholder="ghp_..."
                      />
                    </Box>
                  </TabsContent>
                </Tabs>

                <Flex className="justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isCreating}>
                    Отмена
                  </Button>
                  <Button onClick={handleCreateRepository} disabled={isCreating}>
                    {isCreating ? 'Создание...' : (createType === 'empty' ? 'Создать' : 'Клонировать')}
                  </Button>
                </Flex>
              </DialogContent>
            </Dialog>
        }
      >
        <Input
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm h-9 bg-muted/50 border-border/50"
        />
      </PageHeader>

      <Box className="flex-1 p-6 overflow-auto">
        {repositories.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
          repositories.length === 0 ? (
            <EmptyState
              icon={FolderGit2}
              title="Нет репозиториев"
              description="Создайте первый репозиторий чтобы начать работу с кодом в проекте"
              action={{
                label: 'Создать репозиторий',
                onClick: () => setIsDialogOpen(true),
                icon: Plus,
              }}
            />
          ) : (
            <EmptyState
              icon={Search}
              title="Ничего не найдено"
              description={`По запросу «${search}» репозитории не найдены`}
            />
          )
        ) : (
          <VStack className="space-y-2">
            {repositories
              .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
              .map(repo => (
                <Card
                  key={repo.id}
                  className="cursor-pointer hover:border-primary/50 transition-all duration-200 group"
                  onClick={() => onOpenRepository(repo.id)}
                >
                  <CardContent className="p-4">
                    <Flex className="items-center justify-between">
                      <Flex className="items-center gap-3 min-w-0 flex-1">
                        <Box className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                          <GitBranch className="w-4 h-4 text-primary" />
                        </Box>
                        <Box className="min-w-0 flex-1">
                          <Flex className="items-center gap-2">
                            <Text className="font-medium truncate group-hover:text-primary transition-colors">{repo.name}</Text>
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 flex-shrink-0">
                              <Lock className="w-3 h-3 mr-1" />
                              Private
                            </Badge>
                          </Flex>
                          {repo.description && (
                            <Text size="sm" variant="muted" className="truncate mt-0.5">{repo.description}</Text>
                          )}
                          <Flex className="items-center gap-3 mt-1.5">
                            {repo.default_branch && (
                              <Flex className="items-center gap-1">
                                <GitBranch className="w-3 h-3 text-muted-foreground" />
                                <Text size="xs" variant="muted">{repo.default_branch}</Text>
                              </Flex>
                            )}
                            {repo.created_at && (
                              <Flex className="items-center gap-1">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                <Text size="xs" variant="muted">
                                  {new Date(repo.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Text>
                              </Flex>
                            )}
                          </Flex>
                        </Box>
                      </Flex>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                        onClick={(e) => { e.stopPropagation(); onOpenRepository(repo.id); }}
                      >
                        Open
                      </Button>
                    </Flex>
                  </CardContent>
                </Card>
              ))}
          </VStack>
        )}
      </Box>
    </Flex>
  );
}


