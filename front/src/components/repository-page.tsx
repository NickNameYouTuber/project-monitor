import React, { useEffect, useState } from 'react';
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
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { LoadingSpinner } from './loading-spinner';
import { MergeRequestPage } from './merge-request-page';
import type { Project, Task } from '../App';
import { listRepositories, type RepositoryDto } from '../api/repositories';
import { listFiles, type FileEntry, listCommits } from '../api/repository-content';

interface RepositoryPageProps {
  projects: Project[];
  tasks: Task[];
  initialRepoId?: string;
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
    <div>
      <div 
        className={`flex items-center gap-2 py-1 px-2 hover:bg-accent rounded cursor-pointer`}
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
            <div className="w-4" />
            <File className="w-4 h-4 text-gray-500" />
          </>
        )}
        <span className="flex-1">{node.name}</span>
        {node.type === 'file' && node.size && (
          <span className="text-xs text-muted-foreground">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>
      
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
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
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <GitMerge className="w-4 h-4" />
              <h4 className="font-medium">{mr.title}</h4>
              <Badge className={statusColors[mr.status]}>
                {mr.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{mr.description}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{mr.sourceBranch} → {mr.targetBranch}</span>
              <span>by {mr.author}</span>
              <span>{mr.createdAt.toLocaleDateString()}</span>
              <span className="text-green-600">+{mr.changes.additions}</span>
              <span className="text-red-600">-{mr.changes.deletions}</span>
              <span>{mr.changes.files} files</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onViewMR(mr.sourceBranch)}>
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            {mr.status === 'open' && (
              <Button size="sm">
                Merge
              </Button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="border-t pt-4">
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">Comments ({mr.comments.length})</h5>
                <div className="space-y-2">
                  {mr.comments.map((comment) => (
                    <div key={comment.id} className="bg-muted p-3 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {comment.author.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">
                          {comment.createdAt.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {mr.status === 'open' && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addComment()}
                  />
                  <Button size="sm" onClick={addComment}>
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
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
    <div className="space-y-6">
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
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Private
                </div>
              </SelectItem>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Public
                </div>
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
          <div className="flex items-center justify-between">
            <div>
              <Label>Protect main branch</Label>
              <p className="text-sm text-muted-foreground">Prevent direct pushes to main branch</p>
            </div>
            <Switch
              checked={settings.protectMain}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, protectMain: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Require pull request reviews</Label>
              <p className="text-sm text-muted-foreground">Require at least one review before merging</p>
            </div>
            <Switch
              checked={settings.requireReviews}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requireReviews: checked }))}
            />
          </div>
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
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow merge requests</Label>
              <p className="text-sm text-muted-foreground">Enable merge request functionality</p>
            </div>
            <Switch
              checked={settings.allowMergeRequests}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allowMergeRequests: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-delete merged branches</Label>
              <p className="text-sm text-muted-foreground">Automatically delete branches after merge</p>
            </div>
            <Switch
              checked={settings.autoDeleteBranches}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoDeleteBranches: checked }))}
            />
          </div>
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
          <div className="space-y-3">
            {['John Doe', 'Jane Smith', 'Mike Johnson'].map((collaborator) => (
              <div key={collaborator} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      {collaborator.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span>{collaborator}</span>
                </div>
                <Badge variant="secondary">Admin</Badge>
              </div>
            ))}
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Collaborator
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function RepositoryPage({ projects, tasks, initialRepoId }: RepositoryPageProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [repositories, setRepositories] = useState<RepositoryDto[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingMR, setViewingMR] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      } catch {}
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
        setBranches(brs && brs.length ? brs : (def.default ? [def.default] : []));
        setSelectedBranch(def.default || brs[0] || '');
        setCurrentPath('');
      } catch {}
    })();
  }, [selectedRepoId]);

  useEffect(() => {
    (async () => {
      if (!selectedRepoId || !selectedBranch) return;
      try {
        const [fs, cs] = await Promise.all([
          listFiles(selectedRepoId, selectedBranch, currentPath || undefined),
          listCommits(selectedRepoId, selectedBranch)
        ]);
        setEntries(fs);
        setCommits(cs);
      } catch {}
    })();
  }, [selectedRepoId, selectedBranch, currentPath]);
  
  const linkedTasks = selectedProject 
    ? tasks.filter(task => task.projectId === selectedProject.id && task.repositoryBranch)
    : [];

  if (isLoading) {
    return <LoadingSpinner 
      stages={['Locate Project', 'Connect Repo', 'Fetch Content', 'Ready']}
    />;
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
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1>Repository</h1>
            <p className="text-muted-foreground">Manage your project repositories and code</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {/* Если репозиторий не выбран — показываем список */}
        {!selectedRepoId ? (
          <Card>
            <CardHeader>
              <CardTitle>Repositories</CardTitle>
            </CardHeader>
            <CardContent>
              {repositories.length === 0 ? (
                <div className="text-sm text-muted-foreground">No repositories yet.</div>
              ) : (
                <div className="space-y-2">
                  {repositories.map(repo => (
                    <div key={repo.id} className="flex items-center justify-between p-2 hover:bg-accent rounded">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        <span>{repo.name}</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setSelectedRepoId(repo.id)}>Open</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
        <Tabs defaultValue="files" className="h-full">
          <TabsList>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="commits">Commits</TabsTrigger>
            <TabsTrigger value="merge-requests">Merge Requests</TabsTrigger>
            <TabsTrigger value="tasks">Linked Tasks</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch} value={branch}>
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4" />
                          {branch}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm" disabled>
                <Plus className="w-4 h-4 mr-2" />
                New File
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
                  <div className="p-4">
                    <div className="text-sm text-muted-foreground mb-3 px-2">
                      Branch: {selectedBranch} {currentPath && `• ${currentPath}`}
                    </div>
                    <div className="text-xs text-muted-foreground px-2 mb-2">
                      <button onClick={() => setCurrentPath('')}>root</button>
                      {currentPath.split('/').filter(Boolean).map((seg, idx, arr) => (
                        <span key={idx}> / <button onClick={() => setCurrentPath(arr.slice(0, idx + 1).join('/'))}>{seg}</button></span>
                      ))}
                    </div>
                    {entries
                      .filter(e => !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((e, i) => (
                        <div key={`${e.path}-${i}`} className={`flex items-center gap-2 py-1 px-2 hover:bg-accent rounded cursor-pointer`}
                             onClick={() => {
                               if (e.type === 'tree') setCurrentPath((currentPath ? currentPath + '/' : '') + e.name);
                             }}>
                          {e.type === 'tree' ? <Folder className="w-4 h-4 text-blue-500" /> : <File className="w-4 h-4 text-gray-500" />}
                          <span className="flex-1">{e.name}</span>
                          {e.type === 'blob' && e.size && (
                            <span className="text-xs text-muted-foreground">{e.size} B</span>
                          )}
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commits" className="space-y-4">
            <div className="space-y-3">
              {commits.map((commit: any, idx) => (
                <Card key={commit.id || commit.sha || idx}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <GitCommit className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{commit.message || commit.fullMessage || 'Commit'}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{commit.author || commit.authorName || ''}</span>
                          <span>{commit.date ? new Date(commit.date).toLocaleDateString() : ''}</span>
                          <code className="px-2 py-1 bg-muted rounded text-xs">{commit.id || commit.sha || ''}</code>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {commits.length === 0 && (
                <div className="text-sm text-muted-foreground">No commits.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="merge-requests" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Merge Requests</h3>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Merge Request
              </Button>
            </div>
            
            <div className="space-y-4">
              {[].map((mr) => (
                <MergeRequestCard key={mr.id} mr={mr} onViewMR={setViewingMR} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Linked Tasks</h3>
              <Badge variant="secondary">{linkedTasks.length} tasks</Badge>
            </div>
            
            <div className="space-y-3">
              {linkedTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{task.priority}</Badge>
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <GitBranch className="w-4 h-4" />
                        <code className="px-2 py-1 bg-muted rounded text-xs">
                          {task.repositoryBranch}
                        </code>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {linkedTasks.length === 0 && (
                <div className="text-center py-8">
                  <Code className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No linked tasks</h3>
                  <p className="text-sm text-muted-foreground">
                    Tasks with repository branches will appear here.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <RepositorySettings />
          </TabsContent>
        </Tabs>
        )}
      </div>
    </div>
  );
}