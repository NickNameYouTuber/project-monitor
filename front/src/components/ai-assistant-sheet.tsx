import React, { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  ScrollArea,
  Textarea,
  Button,
  cn,
} from '@nicorp/nui';
import { ChatMessage } from './chat-message';
import { ChatList } from './chat-list';
import { Send, Loader2, ArrowLeft, X, Sparkles } from 'lucide-react';
import type { Chat } from '../api/chat';
import { useAIAssistant } from '../hooks/useAIAssistant';
import { useChatHistory } from '../hooks/useChatHistory';
import { useNotifications } from '../hooks/useNotifications';
import { createChat } from '../api/chat';

interface AIAssistantSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string | null;
  organizationId?: string | null;
  projectId?: string | null;
  onChatCreated?: (chat: Chat) => void;
}

export function AIAssistantSheet({
  open,
  onOpenChange,
  chatId,
  organizationId,
  projectId,
  onChatCreated,
}: AIAssistantSheetProps) {
  const [inputValue, setInputValue] = useState('');
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { showError } = useNotifications();

  const { chats, loadChats, createNewChat, deleteChat } = useChatHistory(organizationId || null, projectId || null);
  const { messages, isLoading, loadChat, sendMessage, setMessages } = useAIAssistant(currentChatId);

  useEffect(() => {
    if (chatId) {
      setCurrentChatId(chatId);
      setView('chat');
    } else {
      setView('list');
    }
  }, [chatId]);

  useEffect(() => {
    if (open) {
      loadChats();
      if (currentChatId && view === 'chat') {
        loadChat(currentChatId);
      }
    } else if (!open) {
      setMessages([]);
      setView('list');
      setCurrentChatId(null);
    }
  }, [open, currentChatId, view, loadChat, loadChats, setMessages]);

  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view === 'chat') {
        handleBackToList();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open, view]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !currentChatId) return;

    const messageText = inputValue.trim();
    setInputValue('');

    try {
      await sendMessage(messageText);
    } catch (error) {
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape' && view === 'chat') {
      e.preventDefault();
      handleBackToList();
    }
  };

  const handleCreateChat = async () => {
    const newChat = await createNewChat();
    if (newChat) {
      setCurrentChatId(newChat.id);
      setView('chat');
      if (onChatCreated) {
        onChatCreated(newChat);
      }
    }
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setView('chat');
    loadChat(chatId);
  };

  const handleBackToList = () => {
    setView('list');
    setCurrentChatId(null);
    setMessages([]);
  };

  const handleDeleteChat = async (chatIdToDelete: string) => {
    if (currentChatId === chatIdToDelete) {
      const remainingChats = chats.filter(c => c.id !== chatIdToDelete);
      if (remainingChats.length > 0) {
        setCurrentChatId(remainingChats[0].id);
        loadChat(remainingChats[0].id);
      } else {
        handleBackToList();
      }
    }
    await deleteChat(chatIdToDelete);
  };

  const currentChat = chats.find(c => c.id === currentChatId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[700px] flex flex-col p-0 bg-background border-border">
        <div className="relative w-full h-full overflow-hidden">
          {/* Страница списка чатов */}
          <div
            className={cn(
              "absolute inset-0 transition-transform duration-300 ease-in-out bg-background",
              view === 'list' ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <ChatList
              chats={chats}
              currentChatId={currentChatId}
              onSelectChat={handleSelectChat}
              onCreateChat={handleCreateChat}
              onDeleteChat={handleDeleteChat}
              onClose={() => onOpenChange(false)}
            />
          </div>

          {/* Страница чата */}
          <div
            className={cn(
              "absolute inset-0 transition-transform duration-300 ease-in-out bg-background flex flex-col",
              view === 'chat' ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            {/* Шапка чата */}
            <div className="flex items-center gap-2 p-4 border-b border-border bg-background flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToList}
                className="text-foreground"
                aria-label="Вернуться к списку чатов"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-foreground text-base font-semibold truncate">
                  {currentChat?.title || 'AI Assistant'}
                </SheetTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Область сообщений */}
            <ScrollArea className="flex-1 p-6 bg-background" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="p-4 rounded-full bg-primary/10 mb-4">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-base font-medium text-foreground mb-2">
                      Начните разговор с AI ассистентом
                    </p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Задайте вопрос или попросите создать проект, задачу или элемент на вайтборде
                    </p>
                  </div>
                )}
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-card rounded-lg p-4 border border-border flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">AI думает...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Поле ввода */}
            <div className="p-4 border-t border-border bg-background flex-shrink-0">
              <div className="flex gap-2">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Введите сообщение..."
                  rows={2}
                  disabled={isLoading || !currentChatId}
                  className="resize-none bg-background text-foreground border-border"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading || !currentChatId}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
