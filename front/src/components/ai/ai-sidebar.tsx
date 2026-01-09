import React, { useState, useEffect } from 'react';
import { useAISidebar } from '../../contexts/AISidebarContext';
import { GripVertical, X, Sparkles, MessageSquare, History, Settings2, MoreHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { AIConversationView } from './ai-conversation-view';
import { ChatList } from '../chat-list';
import { useChatHistory } from '../../hooks/useChatHistory';
import { useAppContext } from '../../contexts/AppContext';
import { useActiveContext } from '../../hooks/useActiveContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export function AISidebar() {
    const { width, setWidth, setIsOpen, view, setView, currentChatId, setCurrentChatId } = useAISidebar();
    const { currentOrganization, currentProject } = useAppContext();
    const activeContext = useActiveContext();
    const { chats, loadChats, createNewChat, deleteChat } = useChatHistory(
        currentOrganization?.id || null,
        currentProject?.id || null
    );

    const [isResizing, setIsResizing] = useState(false);

    // Load chats on mount
    useEffect(() => {
        loadChats();
    }, [loadChats]);

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
            document.body.style.userSelect = 'auto'; // Re-enable selection
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none'; // Disable selection while resizing
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

    return (
        <div className="flex h-full w-full relative bg-background/50 backdrop-blur-sm">
            {/* Resizer Handle */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-50 flex items-center justify-center group"
                onMouseDown={startResizing}
            >
                <div className="h-8 w-1 bg-border group-hover:bg-primary rounded-full transition-colors" />
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="h-14 border-b border-border flex items-center justify-between px-4 shadow-sm bg-background/95">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-1.5 rounded-md">
                            <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-sm font-semibold leading-none">AI Assistant</h2>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
                                    {activeContext.type}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                    {activeContext.name}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant={view === 'history' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('history')}>
                                        <History className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>History</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    {view === 'history' && (
                        <div className="h-full overflow-hidden">
                            <ChatList
                                chats={chats}
                                currentChatId={currentChatId}
                                onSelectChat={handleSelectChat}
                                onCreateChat={handleCreateChat}
                                onDeleteChat={deleteChat}
                                onClose={() => setIsOpen(false)}
                                hideHeader={true}
                            />
                        </div>
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
