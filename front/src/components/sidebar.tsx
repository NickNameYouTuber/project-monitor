import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  PaintBucket, 
  GitBranch, 
  Settings,
  Folder,
  Video,
  User as UserIcon,
  LogOut
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import type { Page, Project } from '../App';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '../api/users';
import { NotificationBell } from './NotificationBell';
import type { Organization } from '../types/organization';
import { getOrganization } from '../api/organizations';
import { setAccessToken } from '../api/client';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  selectedProject?: Project | null;
  currentOrgId?: string | null;
  simplified?: boolean;
}

const projectNavigation = [
  { id: 'tasks' as Page, label: 'Tasks', icon: CheckSquare },
  { id: 'whiteboard' as Page, label: 'Whiteboard', icon: PaintBucket },
  { id: 'repositories' as Page, label: 'Repositories', icon: GitBranch },
  { id: 'calls' as Page, label: 'Calls', icon: Video },
  { id: 'project-settings' as Page, label: 'Settings', icon: Settings },
];

const globalNavigation = [
  { id: 'projects' as Page, label: 'Projects', icon: Folder },
  { id: 'calls' as Page, label: 'Calls', icon: Video },
  { id: 'account' as Page, label: 'Account', icon: UserIcon },
];

const simplifiedNavigation = [
  { id: 'calls' as Page, label: 'Calls', icon: Video },
  { id: 'account' as Page, label: 'Account', icon: UserIcon },
];

export function Sidebar({ currentPage, onNavigate, selectedProject, currentOrgId, simplified = false }: SidebarProps) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [mainEmail, setMainEmail] = useState('');
  const [ssoEmail, setSsoEmail] = useState<string | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await getCurrentUser();
        setUserName(me.displayName || me.username || '');
        setMainEmail(me.username || '');
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (currentOrgId) {
      (async () => {
        try {
          const org = await getOrganization(currentOrgId);
          setCurrentOrg(org);
          
          // Загрузить SSO информацию если есть
          try {
            const { getCurrentSSOInfo } = await import('../api/sso-user');
            const ssoInfo = await getCurrentSSOInfo(currentOrgId);
            setSsoEmail(ssoInfo?.sso_email || null);
          } catch {
            setSsoEmail(null);
          }
        } catch {
          setCurrentOrg(null);
          setSsoEmail(null);
        }
      })();
    } else {
      setCurrentOrg(null);
      setSsoEmail(null);
    }
  }, [currentOrgId]);
  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-transparent rounded-lg flex items-center justify-center">
            <img src="/logo.svg" alt="NIGIT" className="w-8 h-8" draggable={false} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">NIGIt</h1>
            <p className="text-sm text-muted-foreground">Team Workspace</p>
          </div>
          <NotificationBell />
        </div>
      </div>

      {/* Current organization */}
      {currentOrg && !selectedProject && currentPage === 'projects' && (
        <div className="px-4 mb-4">
          <div className="mb-2 text-xs text-muted-foreground">Current organization</div>
          <div className="px-3 py-2 rounded bg-muted">
            <div className="text-sm font-medium truncate">{currentOrg.name}</div>
            <div className="text-xs text-muted-foreground truncate">/{currentOrg.slug}</div>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => window.location.href = '/organizations'}>
            Back to Organizations
          </Button>
        </div>
      )}

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
          {(() => {
            let navigation;
            if (simplified) {
              navigation = simplifiedNavigation;
            } else if (selectedProject) {
              navigation = projectNavigation;
            } else if (currentOrgId) {
              navigation = globalNavigation;
            } else {
              navigation = simplifiedNavigation;
            }
            
            return navigation.map((item) => {
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
            });
          })()}
        </div>
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">{(userName || ' ').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{mainEmail}</p>
            {currentOrgId && ssoEmail && ssoEmail !== mainEmail && (
              <p className="text-xs text-blue-500 truncate mt-0.5" title="SSO Account for this organization">
                🔐 {ssoEmail}
              </p>
            )}
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start gap-2"
          onClick={() => {
            // Очистить все данные
            setAccessToken(null);
            localStorage.removeItem('currentOrgId');
            sessionStorage.clear();
            // Редирект на страницу авторизации
            navigate('/auth');
          }}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}