import React, { useState } from 'react';
import {
  CheckSquare,
  PaintBucket,
  GitBranch,
  Folder,
  Video,
  User as UserIcon,
  LogOut,
  Shield,
  Building2,
  Settings
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import type { Page, Project } from '../App';
import { NotificationBell } from './NotificationBell';
import { setAccessToken } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useMainAccount, useSSOAccount } from '../hooks/useAccountContext';
import { useAppContext } from '../contexts/AppContext';
import { useAccountContext } from '../hooks/useAccountContext';
import { useRouteState } from '../hooks/useRouteState';
import { AIAssistantButton } from './ai-assistant-button';
import { AIAssistantSheet } from './ai-assistant-sheet';
import { useChatHistory } from '../hooks/useChatHistory';
import type { Chat } from '../api/chat';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  selectedProject?: Project | null;
  currentOrgId?: string | null;
  simplified?: boolean;
}

const organizationsNavigation = [
  { id: 'organizations' as Page, label: 'Organizations', icon: Building2 },
  { id: 'account' as Page, label: 'Account', icon: UserIcon },
];

const organizationNavigation = [
  { id: 'projects' as Page, label: 'Projects', icon: Folder },
  { id: 'calls' as Page, label: 'Calls', icon: Video },
  { id: 'account-organization' as Page, label: 'Account Organization', icon: Shield },
  { id: 'settings' as Page, label: 'Settings', icon: Settings },
];

const projectNavigation = [
  { id: 'tasks' as Page, label: 'Tasks', icon: CheckSquare },
  { id: 'calls' as Page, label: 'Calls', icon: Video },
  { id: 'whiteboard' as Page, label: 'Whiteboard', icon: PaintBucket },
  { id: 'repositories' as Page, label: 'Git', icon: GitBranch },
  { id: 'account-organization' as Page, label: 'Account Organization', icon: Shield },
];

export function Sidebar({ currentPage, onNavigate, selectedProject, currentOrgId, simplified = false }: SidebarProps) {
  const navigate = useNavigate();
  const { account: mainAccount } = useMainAccount();
  const { account: ssoAccount } = useSSOAccount();
  const { clearContext, currentOrganization, currentProject } = useAppContext();
  const { clearAccounts } = useAccountContext();
  const routeState = useRouteState();
  const { isOrganizationsPage, isInOrganization, isInProject } = routeState;

  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const { chats, createNewChat } = useChatHistory(
    currentOrganization?.id || null,
    currentProject?.id || null
  );

  const userName = mainAccount?.displayName || mainAccount?.username || '';
  const mainEmail = mainAccount?.username || '';
  const ssoEmail = ssoAccount?.sso_email || null;
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

      {/* Context section - Organization */}
      {isInOrganization && currentOrganization && (
        <div className="px-4 mb-4">
          <div className="mb-2 text-xs text-muted-foreground">Current organization</div>
          <div className="px-3 py-2 rounded bg-muted">
            <div className="text-sm font-medium truncate">{currentOrganization.name}</div>
            <div className="text-xs text-muted-foreground truncate">/{currentOrganization.slug}</div>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate('/organizations')}>
            Back to Organizations
          </Button>
        </div>
      )}

      {/* Context section - Project */}
      {isInProject && currentOrganization && currentProject && (
        <div className="px-4 mb-4">
          <div className="mb-2 text-xs text-muted-foreground">Current organization</div>
          <div className="px-3 py-2 rounded bg-muted mb-3">
            <div className="text-sm font-medium truncate">{currentOrganization.name}</div>
            <div className="text-xs text-muted-foreground truncate">/{currentOrganization.slug}</div>
          </div>
          <div className="mb-2 text-xs text-muted-foreground">Current project</div>
          <div className="px-3 py-2 rounded bg-muted mb-2">
            <div className="text-sm font-medium truncate">{currentProject.title}</div>
            <div className="text-xs truncate" style={{ color: currentProject.color }}>{currentProject.id}</div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigate('projects')}>
            Back to Projects
          </Button>
        </div>
      )}

      <nav className="flex-1 px-4 pb-4">
        <div className="space-y-2">
          {(() => {
            let navigation;
            if (isOrganizationsPage || currentPage === 'account') {
              navigation = organizationsNavigation;
            } else if (isInProject) {
              navigation = projectNavigation;
            } else if (isInOrganization) {
              navigation = organizationNavigation;
            } else {
              navigation = organizationsNavigation;
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
        {isOrganizationsPage ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">{(userName || ' ').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{mainEmail}</p>
            </div>
          </div>
        ) : (
          <>
            {ssoEmail && ssoEmail !== mainEmail && (
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">SSO Account</p>
                  <p className="text-sm font-medium truncate">{ssoEmail}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">{(userName || ' ').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium truncate", ssoEmail && ssoEmail !== mainEmail && "text-xs text-muted-foreground")}>{userName}</p>
                <p className={cn("text-xs truncate", ssoEmail && ssoEmail !== mainEmail ? "text-xs text-muted-foreground" : "text-muted-foreground")}>{mainEmail}</p>
              </div>
            </div>
          </>
        )}
        <AIAssistantButton
          onClick={() => {
            setIsAIAssistantOpen(true);
          }}
          hasUnreadMessages={false}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => {
            // Очистить все данные
            setAccessToken(null);
            localStorage.removeItem('currentOrgId');
            sessionStorage.clear();
            // Очистить контексты
            clearContext();
            clearAccounts();
            // Триггер кастомного события для обновления isAuthenticated
            window.dispatchEvent(new CustomEvent('auth-changed', { detail: { authenticated: false } }));
            // Редирект на страницу авторизации
            navigate('/auth');
          }}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

      <AIAssistantSheet
        open={isAIAssistantOpen}
        onOpenChange={setIsAIAssistantOpen}
        chatId={currentChatId}
        organizationId={currentOrganization?.id || null}
        projectId={currentProject?.id || null}
        onChatCreated={(chat: Chat) => {
          setCurrentChatId(chat.id);
        }}
      />
    </div>
  );
}