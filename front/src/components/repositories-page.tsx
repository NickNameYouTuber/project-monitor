import React, { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, Button, Input,
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
  Tabs, TabsContent, TabsList, TabsTrigger, Label, Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Box, Flex, VStack, Heading, Text
} from '@nicorp/nui';
import { GitBranch, Plus } from 'lucide-react';
import { LoadingSpinner } from './loading-spinner';
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
      loadRepositories();

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
      <Box className="border-b border-border p-6">
        <Flex className="items-center justify-between mb-4">
          <Box>
            <Heading level={2}>Repositories</Heading>
            <Text className="text-muted-foreground">Select a repository to view details</Text>
          </Box>
          <Flex className="items-center gap-3">
            <Input
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
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
                        <Select value={newRepo.visibility} onValueChange={(v) => setNewRepo(prev => ({ ...prev, visibility: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="public">Public</SelectItem>
                          </SelectContent>
                        </Select>
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
          </Flex>
        </Flex>
      </Box>

      <Box className="flex-1 p-6 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle>Repositories</CardTitle>
          </CardHeader>
          <CardContent>
            {repositories.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
              <Text className="text-sm text-muted-foreground">No repositories.</Text>
            ) : (
              <VStack className="space-y-2">
                {repositories
                  .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
                  .map(repo => (
                    <Flex key={repo.id} className="items-center justify-between p-2 hover:bg-accent rounded">
                      <Flex className="items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        <Text as="span">{repo.name}</Text>
                      </Flex>
                      <Button size="sm" variant="outline" onClick={() => onOpenRepository(repo.id)}>Open</Button>
                    </Flex>
                  ))}
              </VStack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Flex>
  );
}


