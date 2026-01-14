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
import { Button, cn, Box, Flex, VStack, Heading, Text } from '@nicorp/nui';
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
  { id: 'project-settings' as Page, label: 'Settings', icon: Settings },
];

export function Sidebar({ currentPage, onNavigate, selectedProject, currentOrgId, simplified = false }: SidebarProps) {
  const navigate = useNavigate();
  const { account: mainAccount } = useMainAccount();
  const { account: ssoAccount } = useSSOAccount();
  const { clearContext, currentOrganization, currentProject } = useAppContext();
  const { clearAccounts } = useAccountContext();
  const routeState = useRouteState();
  const { isOrganizationsPage, isInOrganization, isInProject } = routeState;

  const userName = mainAccount?.displayName || mainAccount?.username || '';
  const mainEmail = mainAccount?.username || '';
  const ssoEmail = ssoAccount?.sso_email || null;
  return (
    <Flex className="w-64 bg-card border-r border-border flex-col">
      <Box className="p-6">
        <Flex className="items-center gap-3 mb-4">
          <Box className="w-8 h-8 bg-transparent rounded-lg flex items-center justify-center">
            <img src="/logo.svg" alt="NIGIT" className="w-8 h-8" draggable={false} />
          </Box>
          <Box className="flex-1">
            <Heading level={2} className="text-xl">NIGIt</Heading>
            <Text size="sm" variant="muted">Team Workspace</Text>
          </Box>
          <NotificationBell />
        </Flex>
      </Box>

      {/* Context section - Organization */}
      {isInOrganization && currentOrganization && (
        <Box className="px-4 mb-4">
          <Box className="mb-2 text-xs text-muted-foreground">Current organization</Box>
          <Box className="px-3 py-2 rounded bg-muted">
            <Box className="text-sm font-medium truncate">{currentOrganization.name}</Box>
            <Box className="text-xs text-muted-foreground truncate">/{currentOrganization.slug}</Box>
          </Box>
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate('/organizations')}>
            Back to Organizations
          </Button>
        </Box>
      )}

      {/* Context section - Project */}
      {isInProject && currentOrganization && currentProject && (
        <Box className="px-4 mb-4">
          <Box className="mb-2 text-xs text-muted-foreground">Current organization</Box>
          <Box className="px-3 py-2 rounded bg-muted mb-3">
            <Box className="text-sm font-medium truncate">{currentOrganization.name}</Box>
            <Box className="text-xs text-muted-foreground truncate">/{currentOrganization.slug}</Box>
          </Box>
          <Box className="mb-2 text-xs text-muted-foreground">Current project</Box>
          <Box className="px-3 py-2 rounded bg-muted mb-2">
            <Box className="text-sm font-medium truncate">{currentProject.title}</Box>
            <Box className="text-xs truncate" style={{ color: currentProject.color }}>{currentProject.id}</Box>
          </Box>
          <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigate('projects')}>
            Back to Projects
          </Button>
        </Box>
      )}

      <Box as="nav" className="flex-1 px-4 pb-4 overflow-y-auto">
        <VStack className="space-y-2">
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
        </VStack>
      </Box>

      <Box className="p-4 border-t border-border space-y-2">
        {isOrganizationsPage ? (
          <Flex className="items-center gap-3">
            <Box className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <Text as="span" size="sm" weight="medium">{(userName || ' ').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</Text>
            </Box>
            <Box className="flex-1 min-w-0">
              <Text size="sm" weight="medium" className="truncate">{userName}</Text>
              <Text size="xs" variant="muted" className="truncate">{mainEmail}</Text>
            </Box>
          </Flex>
        ) : (
          <>
            {ssoEmail && ssoEmail !== mainEmail && (
              <Flex className="items-center gap-3 mb-2">
                <Box className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </Box>
                <Box className="flex-1 min-w-0">
                  <Text size="xs" variant="muted" className="mb-0.5">SSO Account</Text>
                  <Text size="sm" weight="medium" className="truncate">{ssoEmail}</Text>
                </Box>
              </Flex>
            )}
            <Flex className="items-center gap-3">
              <Box className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <Text as="span" size="sm" weight="medium">{(userName || ' ').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</Text>
              </Box>
              <Box className="flex-1 min-w-0">
                <Text className={cn("text-sm font-medium truncate", ssoEmail && ssoEmail !== mainEmail && "text-xs text-muted-foreground")}>{userName}</Text>
                <Text className={cn("text-xs truncate", ssoEmail && ssoEmail !== mainEmail ? "text-xs text-muted-foreground" : "text-muted-foreground")}>{mainEmail}</Text>
              </Box>
            </Flex>
          </>
        )}
        <AIAssistantButton hasUnreadMessages={false} />
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
      </Box>
    </Flex>
  );
}