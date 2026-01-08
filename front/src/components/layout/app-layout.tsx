import React, { ReactNode } from 'react';
import { Sidebar } from '../sidebar';
import { AISidebar } from '../ai/ai-sidebar';
import { useAISidebar } from '../../contexts/AISidebarContext';
import { useAppContext } from '../../contexts/AppContext';
import { useRouteState } from '../../hooks/useRouteState';
import { useNavigate } from 'react-router-dom';
import type { Page } from '../../App';
import { cn } from '../ui/utils';

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

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Left Navigation Sidebar */}
            <Sidebar
                currentPage={currentPage}
                onNavigate={onNavigate}
                selectedProject={currentProject}
                currentOrgId={organizationId}
            />

            {/* Main Content Area */}
            <div
                className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out"
                style={{ marginRight: isOpen ? 0 : 0 }}
            >
                {children}
            </div>

            {/* Right AI Sidebar */}
            <div
                className={cn(
                    "border-l border-border bg-card flex flex-col transition-all duration-300 ease-in-out shadow-xl z-20",
                    isOpen ? "translate-x-0" : "translate-x-full absolute right-0 h-full"
                )}
                style={{
                    width: isOpen ? width : 0,
                    opacity: isOpen ? 1 : 0,
                    position: isOpen ? 'relative' : 'absolute'
                }}
            >
                {isOpen && <AISidebar />}
            </div>
        </div>
    );
}
