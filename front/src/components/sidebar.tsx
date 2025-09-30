import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  PaintBucket, 
  GitBranch, 
  Settings,
  Folder,
  Video
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import type { Page, Project } from '../App';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '../api/users';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  selectedProject?: Project | null;
}

const navigation = [
  { id: 'tasks' as Page, label: 'Tasks', icon: CheckSquare },
  { id: 'whiteboard' as Page, label: 'Whiteboard', icon: PaintBucket },
  { id: 'repositories' as Page, label: 'Repositories', icon: GitBranch },
  { id: 'calls' as Page, label: 'Calls', icon: Video },
  { id: 'settings' as Page, label: 'Settings', icon: Settings },
];

export function Sidebar({ currentPage, onNavigate, selectedProject }: SidebarProps) {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const me = await getCurrentUser();
        setUserName(me.displayName || me.username || '');
        setUserEmail(me.username || '');
      } catch {}
    })();
  }, []);
  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-transparent rounded-lg flex items-center justify-center">
            <img src="/nigit-logo.svg" alt="NIGIT" className="w-8 h-8" draggable={false} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">NIGIt</h1>
            <p className="text-sm text-muted-foreground">Team Workspace</p>
          </div>
        </div>
      </div>

      {/* Current project and Back */}
      {selectedProject && (
        <div className="px-4">
          <div className="mb-3 text-xs text-muted-foreground">Current project</div>
          <div className="mb-2 px-3 py-2 rounded bg-muted">
            <div className="text-sm font-medium truncate">{selectedProject.title}</div>
            <div className="text-xs truncate" style={{ color: selectedProject.color }}>{selectedProject.id}</div>
          </div>
          <Button variant="outline" size="sm" className="w-full mb-4" onClick={() => onNavigate('projects')}>
            Back to Projects
          </Button>
        </div>
      )}

      <nav className="flex-1 px-4 pb-4">
        <div className="space-y-2">
          {selectedProject ? (
            navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentPage === item.id ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 h-11',
                    currentPage === item.id && 'bg-secondary text-secondary-foreground'
                  )}
                  onClick={() => onNavigate(item.id)}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Button>
              );
            })
          ) : (
            // Показываем только общие навигационные элементы когда проект не выбран
            [
              { id: 'projects' as Page, label: 'Projects', icon: Folder },
              { id: 'calls' as Page, label: 'Calls', icon: Video },
              { id: 'settings' as Page, label: 'Settings', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentPage === item.id ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 h-11',
                    currentPage === item.id && 'bg-secondary text-secondary-foreground'
                  )}
                  onClick={() => onNavigate(item.id)}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Button>
              );
            })
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">{(userName || ' ').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>
      </div>
    </div>
  );
}