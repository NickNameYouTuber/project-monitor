import React, { useState, useEffect } from 'react';
import { useAISidebar } from '../../contexts/AISidebarContext';
import { X, History, Sparkles } from 'lucide-react';
import {
    Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
    ChatHeader, ConversationList, cn,
    type Conversation
} from '@nicorp/nui';
import { AIConversationView } from './ai-conversation-view';
import { useChatHistory } from '../../hooks/useChatHistory';
import { useAppContext } from '../../contexts/AppContext';
import { useActiveContext } from '../../hooks/useActiveContext';

export function AISidebar() {
    const { width, setWidth, setIsOpen, view, setView, currentChatId, setCurrentChatId } = useAISidebar();
    const { currentOrganization, currentProject } = useAppContext();
    const activeContext = useActiveContext();
    const { chats, loadChats, createNewChat, deleteChat } = useChatHistory(
        currentOrganization?.id || null,
        currentProject?.id || null
    );

    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        loadChats();
    }, [loadChats]);

    useEffect(() => {
        if (currentChatId) {
            setView('chat');
        }
    }, []);

    // Handle resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            setWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, setWidth]);

    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const handleSelectChat = (chatId: string) => {
        setCurrentChatId(chatId);
        setView('chat');
    };

    const handleCreateChat = async () => {
        const newChat = await createNewChat();
        if (newChat) {
            setCurrentChatId(newChat.id);
            setView('chat');
        }
    };

    const conversations: Conversation[] = chats.map(c => ({
        id: c.id,
        title: c.title || 'Без названия',
        lastMessage: undefined,
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
    }));

    return (
        <div className="flex h-full w-full relative bg-background border-l border-border/50">
            {/* Resizer */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-50 flex items-center justify-center group"
                onMouseDown={startResizing}
            >
                <div className="h-8 w-0.5 bg-border/50 group-hover:bg-primary/50 rounded-full transition-colors" />
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden pl-1">
                {/* Header */}
                <div className="flex items-center justify-between h-12 px-3 border-b border-border/40 bg-background/95 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500/15 to-blue-500/15 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-foreground">AI Assistant</span>
                            {activeContext.name && (
                                <span className="text-[10px] text-muted-foreground/60 ml-2">{activeContext.name}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setView('history')}
                                        className={cn(
                                            "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
                                            view === 'history'
                                                ? "bg-muted text-foreground"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                        )}
                                    >
                                        <History className="w-3.5 h-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">История</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative">
                    {view === 'history' && (
                        <ConversationList
                            conversations={conversations}
                            activeId={currentChatId || undefined}
                            onSelect={handleSelectChat}
                            onNew={handleCreateChat}
                            onDelete={deleteChat}
                            showSearch={true}
                        />
                    )}

                    {view === 'chat' && (
                        <AIConversationView
                            chatId={currentChatId}
                            onBack={() => setView('history')}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
