import React from 'react';
import { ScrollArea, Button, cn, Box, Flex, Heading, Text } from '@nicorp/nui';
import { Plus, MessageSquare, Trash2, Sparkles, X } from 'lucide-react';

import type { Chat } from '../api/chat';

interface ChatListProps {
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onClose?: () => void;
  hideHeader?: boolean;
}

export function ChatList({
  chats,
  currentChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  onClose,
  hideHeader
}: ChatListProps) {
  return (
    <Flex className="flex-col h-full w-full bg-background">
      {/* Шапка */}
      {!hideHeader && (
        <Flex className="items-center justify-between p-4 border-b border-border bg-background flex-shrink-0">
          <Flex className="items-center gap-2">
            <Box className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </Box>
            <Heading level={6} className="text-foreground text-lg font-semibold">AI Assistant</Heading>
          </Flex>
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
        </Flex>
      )}

      {/* Кнопка создания нового чата */}
      <Box className="p-4 border-b border-border bg-background flex-shrink-0">
        <Button
          onClick={onCreateChat}
          size="sm"
          className="w-full justify-center gap-2"
          variant="default"
        >
          <Plus className="w-4 h-4" />
          Новый чат
        </Button>
      </Box>

      {/* Список чатов */}
      <ScrollArea className="flex-1">
        <Box className="p-2 space-y-1">
          {chats.map((chat) => (
            <Box
              key={chat.id}
              className={cn(
                "group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors bg-card border border-border hover:bg-muted",
                currentChatId === chat.id && "bg-muted border-primary/50"
              )}
              onClick={() => onSelectChat(chat.id)}
            >
              <Box className="flex-shrink-0 p-2 rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="w-4 h-4" />
              </Box>
              <Box className="flex-1 min-w-0">
                <Text className="text-sm font-medium truncate text-foreground">{chat.title || 'Без названия'}</Text>
                {chat.updatedAt && (
                  <Text className="text-xs text-muted-foreground mt-1">
                    {new Date(chat.updatedAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
              </Box>
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
            </Box>
          ))}
          {chats.length === 0 && (
            <Flex className="flex-col items-center justify-center py-16 px-4 text-center">
              <Box className="p-4 rounded-full bg-muted mb-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </Box>
              <Text className="text-sm font-medium text-foreground mb-2">Нет чатов</Text>
              <Text className="text-xs text-muted-foreground mb-4">
                Создайте новый чат, чтобы начать общение с AI ассистентом
              </Text>
              <Button
                onClick={onCreateChat}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Создать чат
              </Button>
            </Flex>
          )}
        </Box>
      </ScrollArea>
    </Flex>
  );
}

