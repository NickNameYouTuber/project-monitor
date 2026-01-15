import React, { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from '../sidebar';
import { AISidebar } from '../ai/ai-sidebar';
import { useAISidebar } from '../../contexts/AISidebarContext';
import { useAppContext } from '../../contexts/AppContext';
import { useRouteState } from '../../hooks/useRouteState';
import { useNavigate } from 'react-router-dom';
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

    // Mobile sidebar state
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            // Close mobile sidebar when switching to desktop
            if (window.innerWidth >= 768) {
                setIsMobileSidebarOpen(false);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close mobile sidebar on navigation
    const handleNavigate = (page: Page) => {
        setIsMobileSidebarOpen(false);
        onNavigate(page);
    };

    return (
        <Flex className="relative h-screen overflow-hidden bg-background">
            {/* Mobile Header with Hamburger */}
            {isMobile && (
                <Box className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                        className="h-10 w-10"
                    >
                        {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                    <Box className="flex items-center gap-2">
                        <img src="/logo.svg" alt="NIGIT" className="w-6 h-6" draggable={false} />
                        <span className="font-semibold">NIGIt</span>
                    </Box>
                </Box>
            )}

            {/* Mobile Overlay */}
            {isMobile && isMobileSidebarOpen && (
                <Box
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* Left Navigation Sidebar */}
            <Box
                className={cn(
                    "bg-card z-50 transition-transform duration-300 ease-in-out",
                    isMobile ? "fixed inset-y-0 left-0 w-64" : "relative",
                    isMobile && !isMobileSidebarOpen && "-translate-x-full",
                    isMobile && isMobileSidebarOpen && "translate-x-0",
                    isMobile && "pt-16" // Account for mobile header
                )}
            >
                <Sidebar
                    currentPage={currentPage}
                    onNavigate={handleNavigate}
                    selectedProject={currentProject}
                    currentOrgId={organizationId}
                    onCloseMobile={() => setIsMobileSidebarOpen(false)}
                    isMobile={isMobile}
                />
            </Box>

            {/* Main Content Area */}
            <Flex
                className={cn(
                    "flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out overflow-auto",
                    isMobile && "pt-14" // Account for mobile header
                )}
                style={{ marginRight: isOpen ? 0 : 0 }}
            >
                {children}
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
