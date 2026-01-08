import { useState, useEffect, useCallback } from 'react';
import type { Chat } from '../api/chat';
import { listChats, createChat, deleteChat as deleteChatApi } from '../api/chat';
import { useNotifications } from './useNotifications';

const CHAT_HISTORY_CACHE_KEY = 'ai_chat_history_cache';

export function useChatHistory(organizationId?: string | null, projectId?: string | null) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useNotifications();

  const loadChats = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load ALL chats - no filtering by org/project
      // Context is stored in each chat and used internally when sending messages
      const loadedChats = await listChats();
      setChats(loadedChats);

      try {
        localStorage.setItem(CHAT_HISTORY_CACHE_KEY, JSON.stringify(loadedChats));
      } catch (e) {
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      showError('Не удалось загрузить историю чатов');

      try {
        const cached = localStorage.getItem(CHAT_HISTORY_CACHE_KEY);
        if (cached) {
          setChats(JSON.parse(cached));
        }
      } catch (e) {
      }
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const createNewChat = useCallback(async (title?: string): Promise<Chat | null> => {
    try {
      const chat = await createChat({
        title: title || 'New Chat',
        organizationId: organizationId || undefined,
        projectId: projectId || undefined,
      });
      setChats((prev) => [chat, ...prev]);
      return chat;
    } catch (error) {
      console.error('Failed to create chat:', error);
      showError('Не удалось создать чат');
      return null;
    }
  }, [organizationId, projectId, showError]);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await deleteChatApi(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));

      try {
        const cached = localStorage.getItem(CHAT_HISTORY_CACHE_KEY);
        if (cached) {
          const cachedChats: Chat[] = JSON.parse(cached);
          const updated = cachedChats.filter((c) => c.id !== chatId);
          localStorage.setItem(CHAT_HISTORY_CACHE_KEY, JSON.stringify(updated));
        }
      } catch (e) {
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
      showError('Не удалось удалить чат');
    }
  }, [showError]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  return {
    chats,
    isLoading,
    loadChats,
    createNewChat,
    deleteChat,
  };
}
