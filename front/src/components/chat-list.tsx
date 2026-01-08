import React from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Plus, MessageSquare, Trash2, Sparkles, X } from 'lucide-react';
import { cn } from './ui/utils';

import type { Chat } from '../api/chat';

interface ChatListProps {
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onClose?: () => void;
}

export function ChatList({
  chats,
  currentChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  onClose,
}: ChatListProps) {
  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Шапка */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-foreground text-lg font-semibold">AI Assistant</h2>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Кнопка создания нового чата */}
      <div className="p-4 border-b border-border bg-background flex-shrink-0">
        <Button
          onClick={onCreateChat}
          size="sm"
          className="w-full justify-center gap-2"
          variant="default"
        >
          <Plus className="w-4 h-4" />
          Новый чат
        </Button>
      </div>

      {/* Список чатов */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors bg-card border border-border hover:bg-muted",
                currentChatId === chat.id && "bg-muted border-primary/50"
              )}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{chat.title || 'Без названия'}</p>
                {chat.updatedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(chat.updatedAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                aria-label="Удалить чат"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {chats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-2">Нет чатов</p>
              <p className="text-xs text-muted-foreground mb-4">
                Создайте новый чат, чтобы начать общение с AI ассистентом
              </p>
              <Button
                onClick={onCreateChat}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Создать чат
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

