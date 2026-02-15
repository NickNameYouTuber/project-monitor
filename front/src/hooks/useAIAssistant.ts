import { useState, useCallback } from 'react';
import type { ChatMessage, Chat } from '../api/chat';
import { getChat, sendMessage as sendChatMessage, updateWidgetState as updateWidgetStateApi } from '../api/chat';
import { useNotifications } from './useNotifications';

export function useAIAssistant(chatId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useNotifications();

  const loadChat = useCallback(async (id: string) => {
    try {
      const chat = await getChat(id);
      setMessages(chat.messages || []);
    } catch (error) {
      console.error('Failed to load chat:', error);
      showError('Не удалось загрузить чат');
    }
  }, [showError]);

  /** Update widget selectedValue in local state AND persist to backend */
  const updateWidgetState = useCallback(async (
    messageId: string,
    widgetId: string,
    widgetType: string,
    selectedValue: string,
  ) => {
    // 1. Optimistically update local state immediately so UI re-renders
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      return {
        ...msg,
        widgets: msg.widgets?.map(w =>
          (w.id ?? '') === widgetId
            ? { ...w, selectedValue, selectedAt: new Date().toISOString() }
            : w
        ),
      };
    }));

    // 2. Persist to backend
    if (chatId) {
      try {
        await updateWidgetStateApi(chatId, messageId, { widgetId, widgetType, selectedValue });
      } catch (error) {
        console.error('Failed to save widget state:', error);
      }
    }
  }, [chatId]);

  const sendMessage = useCallback(async (text: string, isWidgetResponse = false) => {
    if (!chatId || !text || !text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      isWidgetResponse,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(chatId, text.trim(), isWidgetResponse);
      setMessages((prev) => [...prev, response.message]);
      return response;
    } catch (error) {
      console.error('Failed to send message:', error);
      showError('Не удалось отправить сообщение');
      setMessages((prev) => prev.slice(0, -1));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [chatId, isLoading, showError]);

  return {
    messages,
    isLoading,
    loadChat,
    sendMessage,
    setMessages,
    updateWidgetState,
  };
}
