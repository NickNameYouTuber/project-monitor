import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { GitBranch } from 'lucide-react';
import { LoadingSpinner } from './loading-spinner';
import type { Project } from '../App';
import { listRepositories, type RepositoryDto } from '../api/repositories';

interface RepositoriesPageProps {
  project: Project | null;
  onOpenRepository: (repoId: string) => void;
}

export function RepositoriesPage({ project, onOpenRepository }: RepositoriesPageProps) {
  const [repositories, setRepositories] = useState<RepositoryDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!project) return;
      try {
        setIsLoading(true);
        const repos = await listRepositories({ project_id: project.id });
        setRepositories(repos);
      } catch {}
      finally {
        setIsLoading(false);
      }
    })();
  }, [project?.id]);

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
          <div className="relative">
            <Input
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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


