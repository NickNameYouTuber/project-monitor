import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { GitBranch, Plus } from 'lucide-react';
import { LoadingSpinner } from './loading-spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Project } from '../App';
import { listRepositories, createRepository, cloneRepository, type RepositoryDto } from '../api/repositories';
import { toast } from 'sonner';

interface RepositoriesPageProps {
  project: Project | null;
  onOpenRepository: (repoId: string) => void;
}

export function RepositoriesPage({ project, onOpenRepository }: RepositoriesPageProps) {
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
    } catch {}
    finally {
      setIsLoading(false);
    }
  };

  const handleCreateRepository = async () => {
    if (!newRepo.name.trim()) {
      toast.error('Введите название репозитория');
      return;
    }

    setIsCreating(true);
    try {
      if (createType === 'empty') {
        await createRepository({
          name: newRepo.name,
          description: newRepo.description,
          default_branch: newRepo.default_branch,
          visibility: newRepo.visibility,
          project_id: project?.id
        });
        toast.success('Репозиторий создан');
      } else {
        if (!newRepo.url.trim()) {
          toast.error('Введите URL репозитория');
          return;
        }
        await cloneRepository({
          url: newRepo.url,
          name: newRepo.name,
          description: newRepo.description,
          default_branch: newRepo.default_branch,
          visibility: newRepo.visibility,
          project_id: project?.id,
          auth_token: newRepo.auth_token || undefined
        });
        toast.success('Репозиторий клонирован');
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
      toast.error(error.response?.data?.message || 'Ошибка при создании репозитория');
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
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1>Repositories</h1>
            <p className="text-muted-foreground">Select a repository to view details</p>
          </div>
          <div className="flex items-center gap-3">
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
                    <div>
                      <Label htmlFor="name">Название</Label>
                      <Input
                        id="name"
                        value={newRepo.name}
                        onChange={(e) => setNewRepo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="my-repository"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Textarea
                        id="description"
                        value={newRepo.description}
                        onChange={(e) => setNewRepo(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Описание репозитория"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="branch">Default Branch</Label>
                        <Input
                          id="branch"
                          value={newRepo.default_branch}
                          onChange={(e) => setNewRepo(prev => ({ ...prev, default_branch: e.target.value }))}
                          placeholder="master"
                        />
                      </div>
                      
                      <div>
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
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="clone" className="space-y-4">
                    <div>
                      <Label htmlFor="url">URL репозитория</Label>
                      <Input
                        id="url"
                        value={newRepo.url}
                        onChange={(e) => setNewRepo(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://github.com/user/repo.git"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="clone-name">Название</Label>
                      <Input
                        id="clone-name"
                        value={newRepo.name}
                        onChange={(e) => setNewRepo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="my-repository"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="clone-description">Описание</Label>
                      <Textarea
                        id="clone-description"
                        value={newRepo.description}
                        onChange={(e) => setNewRepo(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Описание репозитория"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="auth-token">Токен авторизации (опционально)</Label>
                      <Input
                        id="auth-token"
                        type="password"
                        value={newRepo.auth_token}
                        onChange={(e) => setNewRepo(prev => ({ ...prev, auth_token: e.target.value }))}
                        placeholder="ghp_..."
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isCreating}>
                    Отмена
                  </Button>
                  <Button onClick={handleCreateRepository} disabled={isCreating}>
                    {isCreating ? 'Создание...' : (createType === 'empty' ? 'Создать' : 'Клонировать')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle>Repositories</CardTitle>
          </CardHeader>
          <CardContent>
            {repositories.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
              <div className="text-sm text-muted-foreground">No repositories.</div>
            ) : (
              <div className="space-y-2">
                {repositories
                  .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
                  .map(repo => (
                  <div key={repo.id} className="flex items-center justify-between p-2 hover:bg-accent rounded">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4" />
                      <span>{repo.name}</span>
                    </div>
                     <Button size="sm" variant="outline" onClick={() => onOpenRepository(repo.id)}>Open</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


