import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AISidebarContextType {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    toggleSidebar: () => void;
    width: number;
    setWidth: (width: number) => void;
    view: 'chat' | 'history' | 'settings';
    setView: (view: 'chat' | 'history' | 'settings') => void;
    currentChatId: string | null;
    setCurrentChatId: (id: string | null) => void;
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
const STORAGE_KEY_LAST_CHAT = 'ai_sidebar_last_chat_id';

export function AISidebarProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpenState] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY_OPEN);
        return stored ? JSON.parse(stored) : false;
    });

    const [width, setWidthState] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY_WIDTH);
        return stored ? parseInt(stored, 10) : 400;
    });

    const [view, setView] = useState<'chat' | 'history' | 'settings'>('history');

    // Store chat ID state here to persist when sidebar closes
    const [currentChatId, setCurrentChatIdState] = useState<string | null>(() => {
        return localStorage.getItem(STORAGE_KEY_LAST_CHAT);
    });

    const setIsOpen = (open: boolean) => {
        setIsOpenState(open);
        localStorage.setItem(STORAGE_KEY_OPEN, JSON.stringify(open));
    };

    const setWidth = (w: number) => {
        // Expanded width constraints: 250px to 1200px (or window width)
        const newWidth = Math.max(250, Math.min(w, Math.min(window.innerWidth - 50, 1200)));
        setWidthState(newWidth);
        // Do NOT save to localStorage on every pixel move - performance killer
        // We will assume component using this will handle persist on drag end, 
        // OR we use a debut effect here. 
        // For now, let's just debounce it simply with a timer? 
        // No, let's keep it simple: Write to LS here but wrapped in a timeout/debounce if possible?
        // Actually, removing LS write from here is safer for 60fps, we'll adding an effect.
    };

    // Debounced save for width
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem(STORAGE_KEY_WIDTH, String(width));
        }, 500);
        return () => clearTimeout(timer);
    }, [width]);

    const setCurrentChatId = (id: string | null) => {
        setCurrentChatIdState(id);
        if (id) {
            localStorage.setItem(STORAGE_KEY_LAST_CHAT, id);
        } else {
            localStorage.removeItem(STORAGE_KEY_LAST_CHAT);
        }
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
            setView,
            currentChatId,
            setCurrentChatId
        }}>
            {children}
        </AISidebarContext.Provider>
    );
}
