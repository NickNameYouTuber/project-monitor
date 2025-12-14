import { useState, useCallback } from 'react';
import type { ChatMessage, Chat } from '../api/chat';
import { getChat, sendMessage as sendChatMessage } from '../api/chat';
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

  const sendMessage = useCallback(async (text: string) => {
    if (!chatId || !text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(chatId, text.trim());
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
  };
}
