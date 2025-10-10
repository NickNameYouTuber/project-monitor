import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import socketService from '../features/call/services/socketService';

export interface Notification {
  id: string;
  type: 'call' | 'task';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    callId?: string;
    taskId?: string;
    projectId?: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  showToast: (title: string, description?: string, type?: 'success' | 'error' | 'info') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    showToast(notification.title, notification.message, 'info');
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const showToast = useCallback((title: string, description?: string, type: 'success' | 'error' | 'info' = 'info') => {
    switch (type) {
      case 'success':
        toast.success(title, { description });
        break;
      case 'error':
        toast.error(title, { description });
        break;
      default:
        toast(title, { description });
    }
  }, []);

  useEffect(() => {
    const socket = socketService.getSocket();
    
    if (!socket) return;
    
    const handleCallStarting = (data: { callId: string, title: string, roomId: string }) => {
      addNotification({
        type: 'call',
        title: 'Звонок начинается!',
        message: `"${data.title}" начинается прямо сейчас`,
        actionUrl: `/call/${data.roomId}`,
        metadata: { callId: data.callId }
      });
      
      showToast('Звонок начинается!', `"${data.title}" начинается прямо сейчас`, 'info');
    };
    
    const handleCallReminder = (data: { callId: string, title: string, minutesUntil: number }) => {
      showToast('Напоминание о звонке', `"${data.title}" начнется через ${data.minutesUntil} минут`, 'info');
    };
    
    socket.on('call-starting', handleCallStarting);
    socket.on('call-reminder', handleCallReminder);
    
    return () => {
      socket.off('call-starting', handleCallStarting);
      socket.off('call-reminder', handleCallReminder);
    };
  }, [addNotification, showToast]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    showToast,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

