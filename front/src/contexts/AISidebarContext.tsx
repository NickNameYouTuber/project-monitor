import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AISidebarContextType {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    toggleSidebar: () => void;
    width: number;
    setWidth: (width: number) => void;
    view: 'chat' | 'history' | 'settings';
    setView: (view: 'chat' | 'history' | 'settings') => void;
}

const AISidebarContext = createContext<AISidebarContextType | undefined>(undefined);

export function useAISidebar() {
    const context = useContext(AISidebarContext);
    if (context === undefined) {
        throw new Error('useAISidebar must be used within an AISidebarProvider');
    }
    return context;
}

const STORAGE_KEY_OPEN = 'ai_sidebar_open';
const STORAGE_KEY_WIDTH = 'ai_sidebar_width';

export function AISidebarProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpenState] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY_OPEN);
        return stored ? JSON.parse(stored) : false; // Default closed
    });

    const [width, setWidthState] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY_WIDTH);
        return stored ? parseInt(stored, 10) : 400; // Default 400px
    });

    const [view, setView] = useState<'chat' | 'history' | 'settings'>('history');

    const setIsOpen = (open: boolean) => {
        setIsOpenState(open);
        localStorage.setItem(STORAGE_KEY_OPEN, JSON.stringify(open));
    };

    const setWidth = (w: number) => {
        // Constraint width between 300px and 800px
        const newWidth = Math.max(300, Math.min(w, 800));
        setWidthState(newWidth);
        localStorage.setItem(STORAGE_KEY_WIDTH, String(newWidth));
    };

    const toggleSidebar = () => setIsOpen(!isOpen);

    return (
        <AISidebarContext.Provider value={{
            isOpen,
            setIsOpen,
            toggleSidebar,
            width,
            setWidth,
            view,
            setView
        }}>
            {children}
        </AISidebarContext.Provider>
    );
}
