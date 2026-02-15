import React, { useState, useEffect, useRef } from 'react';
import {
  Sheet, SheetContent,
  ChatInput, ChatHeader,
  ConversationList, AILoading, PromptSuggestions,
  Button, cn,
  type Conversation
} from '@nicorp/nui';
import { ChatMessage } from './chat-message';
import { Bot, Sparkles, ArrowDown } from 'lucide-react';
import type { Chat } from '../api/chat';
import { useAIAssistant } from '../hooks/useAIAssistant';
import { useChatHistory } from '../hooks/useChatHistory';
import { useNavigate } from 'react-router-dom';
import { executeClientAction } from '../lib/client-actions';

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
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const { chats, loadChats, createNewChat, deleteChat } = useChatHistory(organizationId || null, projectId || null);
  const { messages, isLoading, loadChat, sendMessage, setMessages, updateWidgetState } = useAIAssistant(currentChatId);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view === 'chat') {
        handleBackToList();
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, view]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Scroll button visibility
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(gap > 120);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [view]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading || !currentChatId) return;
    await sendMessage(text.trim());
  };

  const handleCreateChat = async () => {
    const newChat = await createNewChat();
    if (newChat) {
      setCurrentChatId(newChat.id);
      setView('chat');
      onChatCreated?.(newChat);
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
  const visibleMessages = messages.filter(msg => !msg.isWidgetResponse);

  const conversations: Conversation[] = chats.map(c => ({
    id: c.id,
    title: c.title || 'Без названия',
    lastMessage: undefined,
    updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[520px] md:w-[600px] lg:w-[680px] flex flex-col p-0 bg-background border-l border-border/50">
        <div className="relative w-full h-full overflow-hidden">
          {/* ═══ Chat List View ═══ */}
          <div
            className={cn(
              "absolute inset-0 transition-all duration-300 ease-out bg-background flex flex-col",
              view === 'list' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
            )}
          >
            <ChatHeader
              title="AI Assistant"
              status="online"
              onSettings={() => onOpenChange(false)}
            />
            <div className="flex-1 overflow-hidden">
              <ConversationList
                conversations={conversations}
                activeId={currentChatId || undefined}
                onSelect={handleSelectChat}
                onNew={handleCreateChat}
                onDelete={handleDeleteChat}
                showSearch={true}
              />
            </div>
          </div>

          {/* ═══ Chat View ═══ */}
          <div
            className={cn(
              "absolute inset-0 transition-all duration-300 ease-out bg-background flex flex-col",
              view === 'chat' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            )}
          >
            {/* Header */}
            <ChatHeader
              title={currentChat?.title || 'AI Assistant'}
              status="online"
              onBack={handleBackToList}
              onSettings={() => onOpenChange(false)}
            />

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain relative">
              <div className="px-3 sm:px-4 py-4">
                {/* Empty state */}
                {visibleMessages.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center py-12 animate-in fade-in-0 duration-500">
                    <div className="relative mb-5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/15 to-blue-500/15 flex items-center justify-center ring-1 ring-violet-500/10">
                        <Sparkles className="w-7 h-7 text-violet-500/70" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center ring-1 ring-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6 text-center">
                      Начните разговор с AI ассистентом
                    </p>
                    <div className="w-full max-w-xs">
                      <PromptSuggestions
                        suggestions={[
                          { title: '📋 Создать задачу', description: 'Создать новую задачу', prompt: 'Создай новую задачу' },
                          { title: '📊 Статус проекта', description: 'Показать статус', prompt: 'Покажи статус проекта' },
                          { title: '💡 Помощь', description: 'Что умеет AI?', prompt: 'Что ты умеешь?' },
                        ]}
                        onSelect={(prompt) => handleSend(prompt)}
                        columns={1}
                      />
                    </div>
                  </div>
                )}

                {/* Messages */}
                {visibleMessages.map((msg) => {
                  const originalIndex = messages.findIndex(m => m.id === msg.id);
                  const nextMsg = messages[originalIndex + 1];
                  const isAnswered = nextMsg?.isWidgetResponse || false;

                  return (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      isAnswered={isAnswered}
                      onAction={async (actionType, payload) => {
                        if (actionType === 'clarification_response') {
                          const messageText = payload.value ? String(payload.value) : '';
                          if (messageText.trim()) {
                            const selectedVal = String(payload.optionId || payload.value || '');
                            if (payload.widgetType) {
                              await updateWidgetState(msg.id, payload.widgetId || '', payload.widgetType, selectedVal);
                            }
                            await sendMessage(messageText, true);
                          }
                        } else if (actionType === 'action_confirmation') {
                          const selectedVal = payload.confirmed ? 'true' : 'false';
                          if (payload.widgetType) {
                            await updateWidgetState(msg.id, payload.widgetId || '', payload.widgetType, selectedVal);
                          }
                          if (payload.confirmed && payload.clientAction) {
                            executeClientAction(payload.clientAction, navigate);
                          }
                          await sendMessage(payload.confirmed ? "Confirmed" : "Cancelled", true);
                        }
                      }}
                    />
                  );
                })}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-start gap-2.5 mb-5 animate-in fade-in-0 duration-300">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/15 to-blue-500/15 flex items-center justify-center ring-1 ring-violet-500/15 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 animate-pulse" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-violet-600/70 dark:text-violet-400/70 tracking-wide uppercase pl-0.5">
                        AI Assistant
                      </span>
                      <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/60 border border-border/30">
                        <AILoading variant="dots" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Scroll to bottom */}
              {showScrollBtn && (
                <div className="sticky bottom-3 flex justify-center z-10">
                  <button
                    onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="h-7 w-7 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border/50 bg-background/95 backdrop-blur-sm px-3 sm:px-4 py-3">
              <ChatInput
                onSend={handleSend}
                placeholder="Напишите сообщение..."
                isLoading={isLoading}
                disabled={isLoading || !currentChatId}
                footerSlot={
                  <span className="text-[10px] text-muted-foreground/50 select-none">
                    Enter — отправить · Shift+Enter — новая строка
                  </span>
                }
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
