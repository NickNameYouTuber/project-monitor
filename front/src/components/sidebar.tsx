import React, { useState, useEffect } from 'react';
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
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { Button, cn, Box, Flex, VStack, Heading, Text, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@nicorp/nui';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@nicorp/nui';
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
import { listRepositories, type RepositoryDto } from '../api/repositories';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page, project?: Project) => void;
  selectedProject?: Project | null;
  currentOrgId?: string | null;
  simplified?: boolean;
  onCloseMobile?: () => void;
  isMobile?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const organizationsNavigation = [
  { id: 'organizations' as Page, label: 'Organizations', icon: Building2 },
  { id: 'account' as Page, label: 'Account', icon: UserIcon },
];

const organizationNavigation = [
  { id: 'projects' as Page, label: 'Projects', icon: Folder },
  { id: 'calls' as Page, label: 'Calls', icon: Video },
  { id: 'account-organization' as Page, label: 'Account', icon: Shield },
  { id: 'settings' as Page, label: 'Settings', icon: Settings },
];

const projectNavigation = [
  { id: 'tasks' as Page, label: 'Tasks', icon: CheckSquare },
  { id: 'calls' as Page, label: 'Calls', icon: Video },
  { id: 'whiteboard' as Page, label: 'Whiteboard', icon: PaintBucket },
  { id: 'repositories' as Page, label: 'Git', icon: GitBranch },
  { id: 'account-organization' as Page, label: 'Account', icon: Shield },
  { id: 'project-settings' as Page, label: 'Settings', icon: Settings },
];

export function Sidebar({ currentPage, onNavigate, selectedProject, currentOrgId, simplified = false, onCloseMobile, isMobile = false, collapsed = false, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { account: mainAccount } = useMainAccount();
  const { account: ssoAccount } = useSSOAccount();
  const { clearContext, currentOrganization, currentProject, isLoading } = useAppContext();
  const { clearAccounts } = useAccountContext();
  const routeState = useRouteState();
  const { isOrganizationsPage, isInOrganization, isInProject } = routeState;

  const userName = mainAccount?.displayName || mainAccount?.username || '';
  const mainEmail = mainAccount?.username || '';
  const ssoEmail = ssoAccount?.sso_email || null;

  const isCollapsed = collapsed && !isMobile;

  // Git dropdown state
  const [gitExpanded, setGitExpanded] = useState(false);
  const [gitRepos, setGitRepos] = useState<RepositoryDto[]>([]);
  const [gitReposLoaded, setGitReposLoaded] = useState(false);

  // Load repos when Git section is expanded
  useEffect(() => {
    if (gitExpanded && !gitReposLoaded && currentProject?.id) {
      listRepositories({ project_id: currentProject.id })
        .then((repos) => {
          setGitRepos(repos);
          setGitReposLoaded(true);
        })
        .catch(() => setGitReposLoaded(true));
    }
  }, [gitExpanded, gitReposLoaded, currentProject?.id]);

  // Reset repos when project changes
  useEffect(() => {
    setGitRepos([]);
    setGitReposLoaded(false);
    setGitExpanded(false);
  }, [currentProject?.id]);

  const NavButton = ({ item, isActive }: { item: typeof organizationsNavigation[0]; isActive: boolean }) => {
    const Icon = item.icon;
    const button = (
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn(
          'w-full gap-3 h-10 transition-all duration-200',
          isActive && 'bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/5',
          isCollapsed ? 'justify-center px-2' : 'justify-start'
        )}
        onClick={() => onNavigate(item.id, isInProject && currentProject ? currentProject : undefined)}
      >
        <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive && 'text-primary')} />
        {!isCollapsed && (
          <span className="truncate text-sm">{item.label}</span>
        )}
      </Button>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  };

  return (
    <Flex className={cn(
      'h-full bg-card border-r border-border flex-col overflow-y-auto transition-all duration-300',
      isCollapsed ? 'w-[68px]' : 'w-64'
    )}>
      {/* Header */}
      <Box className={cn('p-4', isCollapsed && 'px-3')}>
        <Flex className={cn('items-center gap-3', isCollapsed && 'justify-center')}>
          <Box className="w-8 h-8 bg-transparent rounded-lg flex items-center justify-center flex-shrink-0">
            <img src="/logo.svg" alt="NIGIT" className="w-8 h-8" draggable={false} />
          </Box>
          {!isCollapsed && (
            <>
              <Box className="flex-1 min-w-0">
                <Heading level={1} className="text-lg font-bold tracking-tight">NIGIt</Heading>
              </Box>
              <NotificationBell />
            </>
          )}
        </Flex>
      </Box>

      {/* Context cards - Organization & Project */}
      <AnimatePresence mode="wait">
        {!isCollapsed && isInOrganization && currentOrganization && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 mb-3 overflow-hidden"
          >
            <Box className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Organization</Box>
            <Box className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
              {isLoading ? (
                <Box className="text-sm text-muted-foreground animate-pulse">Loading...</Box>
              ) : (
                <>
                  <Box className="text-sm font-medium truncate">{currentOrganization.name}</Box>
                  <Box className="text-xs text-muted-foreground truncate">/{currentOrganization.slug}</Box>
                </>
              )}
            </Box>
            <Button variant="ghost" size="sm" className="w-full mt-1.5 h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => { onNavigate('organizations', undefined); }}>
              Switch Organization
            </Button>
          </motion.div>
        )}

        {!isCollapsed && isInProject && currentOrganization && currentProject && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 mb-3 overflow-hidden"
          >
            <Box className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Organization</Box>
            <Box
              className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50 mb-2 cursor-pointer hover:bg-muted/80 hover:border-primary/30 transition-colors group"
              onClick={() => onNavigate('projects', undefined)}
              title="Go to organization"
            >
              <Box className="text-sm font-medium truncate group-hover:text-primary transition-colors">{currentOrganization.name}</Box>
              <Box className="text-xs text-muted-foreground truncate">/{currentOrganization.slug}</Box>
            </Box>
            <Box className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Project</Box>
            <Box className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
              {isLoading ? (
                <Box className="text-sm text-muted-foreground animate-pulse">Loading...</Box>
              ) : (
                <>
                  <Flex className="items-center gap-2">
                    <Box className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: currentProject.color }} />
                    <Box className="text-sm font-medium truncate">{currentProject.title}</Box>
                  </Flex>
                </>
              )}
            </Box>
            <Button variant="ghost" size="sm" className="w-full mt-1.5 h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => onNavigate('projects', undefined)}>
              Switch Project
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <Box as="nav" className={cn('flex-1 px-3 pb-3 overflow-y-auto', isCollapsed && 'px-2')}>
        {!isCollapsed && (
          <Box className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-2">
            Navigation
          </Box>
        )}
        <VStack className="space-y-1">
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
              // Special handling for Git item — render as expandable dropdown
              if (item.id === 'repositories' && isInProject) {
                const isActive = currentPage === 'repositories';
                const Icon = item.icon;

                if (isCollapsed) {
                  return (
                    <TooltipProvider key={item.id} delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isActive ? 'secondary' : 'ghost'}
                            className={cn(
                              'w-full gap-3 h-10 transition-all duration-200 justify-center px-2',
                              isActive && 'bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/5'
                            )}
                            onClick={() => onNavigate(item.id, currentProject || undefined)}
                          >
                            <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive && 'text-primary')} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          <Box className="space-y-1">
                            <Text className="font-medium text-sm">{item.label}</Text>
                            {gitRepos.length > 0 && (
                              <Box className="border-t border-border pt-1 mt-1 space-y-0.5">
                                {gitRepos.map(repo => (
                                  <Box
                                    key={repo.id}
                                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer py-0.5"
                                    onClick={() => {
                                      if (currentOrgId && currentProject) {
                                        navigate(`/${currentOrgId}/projects/${currentProject.id}/repository/${repo.id}/files`);
                                      }
                                    }}
                                  >
                                    {repo.name}
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </Box>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                return (
                  <Box key={item.id}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full gap-3 h-10 transition-all duration-200 justify-start',
                        isActive && 'bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/5'
                      )}
                      onClick={() => {
                        setGitExpanded(!gitExpanded);
                        if (!gitExpanded && !gitReposLoaded) {
                          // Will trigger load via useEffect
                        }
                      }}
                    >
                      <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive && 'text-primary')} />
                      <span className="truncate text-sm flex-1 text-left">{item.label}</span>
                      {gitExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                    </Button>
                    <AnimatePresence>
                      {gitExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <VStack className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                'w-full justify-start h-7 text-xs text-muted-foreground hover:text-foreground',
                                isActive && !window.location.pathname.includes('/repository/') && 'text-primary font-medium'
                              )}
                              onClick={() => onNavigate('repositories', currentProject || undefined)}
                            >
                              All Repositories
                            </Button>
                            {gitRepos.map(repo => {
                              const isRepoActive = window.location.pathname.includes(`/repository/${repo.id}`);
                              return (
                                <Button
                                  key={repo.id}
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    'w-full justify-start h-7 text-xs gap-1.5',
                                    isRepoActive ? 'text-primary font-medium bg-primary/5' : 'text-muted-foreground hover:text-foreground'
                                  )}
                                  onClick={() => {
                                    if (currentOrgId && currentProject) {
                                      navigate(`/${currentOrgId}/projects/${currentProject.id}/repository/${repo.id}/files`);
                                    }
                                  }}
                                >
                                  <Lock className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{repo.name}</span>
                                </Button>
                              );
                            })}
                            {!gitReposLoaded && (
                              <Text className="text-[11px] text-muted-foreground pl-2 py-1 animate-pulse">Loading...</Text>
                            )}
                            {gitReposLoaded && gitRepos.length === 0 && (
                              <Text className="text-[11px] text-muted-foreground pl-2 py-1">No repositories</Text>
                            )}
                          </VStack>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Box>
                );
              }

              return <NavButton key={item.id} item={item} isActive={currentPage === item.id} />;
            });
          })()}
        </VStack>
      </Box>

      {/* Footer */}
      <Box className={cn('p-3 border-t border-border space-y-2', isCollapsed && 'px-2')}>
        {/* Theme toggle */}
        {isCollapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center px-2 h-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-8 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </Button>
        )}

        {/* Collapse toggle for desktop */}
        {!isMobile && onToggleCollapse && (
          <Button
            variant="ghost"
            size="sm"
            className={cn('w-full h-8 text-muted-foreground hover:text-foreground', isCollapsed ? 'justify-center px-2' : 'justify-start gap-2')}
            onClick={onToggleCollapse}
          >
            {isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            {!isCollapsed && <span className="text-xs">Collapse</span>}
          </Button>
        )}

        {/* User info */}
        {!isCollapsed ? (
          <>
            {isOrganizationsPage ? (
              <Flex className="items-center gap-3 px-1">
                <Box className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Text as="span" size="xs" weight="medium" className="text-primary">{(userName || ' ').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</Text>
                </Box>
                <Box className="flex-1 min-w-0">
                  <Text size="sm" weight="medium" className="truncate">{userName}</Text>
                  <Text size="xs" variant="muted" className="truncate">{mainEmail}</Text>
                </Box>
              </Flex>
            ) : (
              <>
                {ssoEmail && ssoEmail !== mainEmail && (
                  <Flex className="items-center gap-3 mb-1 px-1">
                    <Box className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4" />
                    </Box>
                    <Box className="flex-1 min-w-0">
                      <Text size="xs" variant="muted" className="mb-0.5">SSO Account</Text>
                      <Text size="sm" weight="medium" className="truncate">{ssoEmail}</Text>
                    </Box>
                  </Flex>
                )}
                <Flex className="items-center gap-3 px-1">
                  <Box className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Text as="span" size="xs" weight="medium" className="text-primary">{(userName || ' ').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</Text>
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
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8 text-muted-foreground hover:text-destructive"
              onClick={() => {
                setAccessToken(null);
                localStorage.removeItem('currentOrgId');
                sessionStorage.clear();
                clearContext();
                clearAccounts();
                window.dispatchEvent(new CustomEvent('auth-changed', { detail: { authenticated: false } }));
                navigate('/auth');
              }}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </>
        ) : (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center px-2 h-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setAccessToken(null);
                    localStorage.removeItem('currentOrgId');
                    sessionStorage.clear();
                    clearContext();
                    clearAccounts();
                    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { authenticated: false } }));
                    navigate('/auth');
                  }}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </Box>
    </Flex >
  );
}