import React, { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from '../sidebar';
import { AISidebar } from '../ai/ai-sidebar';
import { useAISidebar } from '../../contexts/AISidebarContext';
import { useAppContext } from '../../contexts/AppContext';
import { useRouteState } from '../../hooks/useRouteState';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Page } from '../../App';
import { cn, Box, Flex, Button } from '@nicorp/nui';
import { Menu, X } from 'lucide-react';

interface AppLayoutProps {
    children: ReactNode;
    currentPage: Page;
    onNavigate: (page: Page) => void;
}

export function AppLayout({ children, currentPage, onNavigate }: AppLayoutProps) {
    const { isOpen, width } = useAISidebar();
    const { currentOrganization, currentProject, organizationId } = useAppContext();
    const routeState = useRouteState();
    const navigate = useNavigate();
    const location = useLocation();

    // Compute a stable animation key: same org = same key (no remount)
    const pathParts = location.pathname.split('/');
    const routeGroup = pathParts[1];
    const reservedRoutes = ['organizations', 'auth', 'invite', 'sso', 'call', 'account', 'calls', ''];
    const isOrgRoute = routeGroup && !reservedRoutes.includes(routeGroup);
    const animationKey = isOrgRoute ? `org-${routeGroup}` : location.pathname;

    // Mobile sidebar state
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    // Collapsible sidebar state (persisted in localStorage)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        return localStorage.getItem('sidebar-collapsed') === 'true';
    });

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setIsMobileSidebarOpen(false);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleToggleCollapse = () => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sidebar-collapsed', String(next));
            return next;
        });
    };

    // Close mobile sidebar on navigation
    const handleNavigate = (page: Page) => {
        setIsMobileSidebarOpen(false);
        onNavigate(page);
    };

    return (
        <Flex className="relative h-screen overflow-hidden bg-background">
            {/* Mobile Header with Hamburger */}
            {isMobile && (
                <Box className="fixed top-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                        className="h-9 w-9"
                    >
                        {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                    <Box className="flex items-center gap-2">
                        <img src="/logo.svg" alt="NIGIT" className="w-6 h-6" draggable={false} />
                        <span className="font-semibold text-sm">NIGIt</span>
                    </Box>
                </Box>
            )}

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobile && isMobileSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        onClick={() => setIsMobileSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Left Navigation Sidebar */}
            <Box
                className={cn(
                    "bg-card z-50 transition-all duration-300 ease-in-out",
                    isMobile ? "fixed inset-y-0 left-0 w-64" : "relative",
                    isMobile && !isMobileSidebarOpen && "-translate-x-full",
                    isMobile && isMobileSidebarOpen && "translate-x-0",
                    isMobile && "pt-14" // Account for mobile header
                )}
            >
                <Sidebar
                    currentPage={currentPage}
                    onNavigate={handleNavigate}
                    selectedProject={currentProject}
                    currentOrgId={organizationId}
                    onCloseMobile={() => setIsMobileSidebarOpen(false)}
                    isMobile={isMobile}
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={handleToggleCollapse}
                />
            </Box>

            {/* Main Content Area */}
            <Flex
                className={cn(
                    "flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out overflow-auto",
                    isMobile && "pt-14"
                )}
                style={{ marginRight: isOpen ? 0 : 0 }}
            >
                <motion.div
                    key={animationKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 flex flex-col min-h-0"
                >
                    {children}
                </motion.div>
            </Flex>

            {/* Right AI Sidebar */}
            <Flex
                className={cn(
                    "bg-card flex-col transition-all duration-300 ease-in-out z-20",
                    isOpen ? "translate-x-0 border-l border-border shadow-xl" : "translate-x-full absolute right-0 h-full border-l-0 shadow-none"
                )}
                style={{
                    width: isOpen ? width : 0,
                    opacity: isOpen ? 1 : 0,
                    position: isOpen ? 'relative' : 'absolute'
                }}
            >
                {isOpen && <AISidebar />}
            </Flex>
        </Flex>
    );
}
