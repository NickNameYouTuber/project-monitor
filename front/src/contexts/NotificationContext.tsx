import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { websocketService } from '../services/websocketService';

export interface Notification {
  id: string;
  type: 'call' | 'task' | 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    callId?: string;
    taskId?: string;
    projectId?: string;
    [key: string]: any;
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
  showToast: (title: string, description?: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  showSuccess: (title: string, description?: string) => void;
  showError: (title: string, description?: string) => void;
  showInfo: (title: string, description?: string) => void;
  showWarning: (title: string, description?: string) => void;
  showCallNotification: (title: string, description?: string, actionUrl?: string, metadata?: any) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'notifications_history';
const MAX_NOTIFICATIONS = 100;
const MAX_AGE_DAYS = 7;

const loadNotificationsFromStorage = (): Notification[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    const now = new Date();
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    
    return parsed
      .map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }))
      .filter((n: Notification) => {
        const age = now.getTime() - n.timestamp.getTime();
        return age < maxAge;
      })
      .slice(0, MAX_NOTIFICATIONS);
  } catch (error) {
    console.error('Ошибка загрузки уведомлений из localStorage:', error);
    return [];
  }
};

const saveNotificationsToStorage = (notifications: Notification[]) => {
  try {
    const toSave = notifications.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('Ошибка сохранения уведомлений в localStorage:', error);
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(() => loadNotificationsFromStorage());

  useEffect(() => {
    const loaded = loadNotificationsFromStorage();
    if (loaded.length > 0) {
      setNotifications(loaded);
    }
  }, []);

  useEffect(() => {
    saveNotificationsToStorage(notifications);
  }, [notifications]);

  const showToast = useCallback((title: string, description?: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    switch (type) {
      case 'success':
        toast.success(title, { description });
        break;
      case 'error':
        toast.error(title, { description });
        break;
      case 'warning':
        toast.warning(title, { description });
        break;
      default:
        toast(title, { description });
    }
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      const cleaned = updated
        .filter(n => {
          const age = Date.now() - n.timestamp.getTime();
          return age < MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
        })
        .slice(0, MAX_NOTIFICATIONS);
      return cleaned;
    });
    
    if (notification.type !== 'call' && notification.type !== 'task') {
      showToast(notification.title, notification.message, notification.type);
    }
  }, [showToast]);

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

  const showSuccess = useCallback((title: string, description?: string) => {
    addNotification({
      type: 'success',
      title,
      message: description || title,
    });
        toast.success(title, { description });
  }, [addNotification]);

  const showError = useCallback((title: string, description?: string) => {
    addNotification({
      type: 'error',
      title,
      message: description || title,
    });
        toast.error(title, { description });
  }, [addNotification]);

  const showInfo = useCallback((title: string, description?: string) => {
    addNotification({
      type: 'info',
      title,
      message: description || title,
    });
    toast.info(title, { description });
  }, [addNotification]);

  const showWarning = useCallback((title: string, description?: string) => {
    addNotification({
      type: 'warning',
      title,
      message: description || title,
    });
    toast.warning(title, { description });
  }, [addNotification]);

  const showCallNotification = useCallback((title: string, description?: string, actionUrl?: string, metadata?: any) => {
    addNotification({
      type: 'call',
      title,
      message: description || title,
      actionUrl,
      metadata,
    });
    
    toast(title, {
      description,
      duration: 15000,
      action: actionUrl ? {
        label: 'Перейти',
        onClick: () => {
          window.location.href = actionUrl;
        }
      } : undefined
    });
  }, [addNotification]);

  useEffect(() => {
    const handleCallStarting = (data: { callId: string, title: string, roomId: string }) => {
      addNotification({
        type: 'call',
        title: 'Звонок начинается!',
        message: `"${data.title}" начинается прямо сейчас`,
        actionUrl: `/call/${data.roomId}`,
        metadata: { callId: data.callId }
      });
      
      toast('Звонок начинается!', {
        description: `"${data.title}" начинается прямо сейчас`,
        duration: 15000,
        action: {
          label: 'В звонок',
          onClick: () => {
            window.location.href = `/call/${data.roomId}`;
          }
        }
      });
    };
    
    const handleCallReminder = (data: { callId: string, title: string, minutesUntil: number }) => {
      addNotification({
        type: 'call',
        title: 'Напоминание о звонке',
        message: `"${data.title}" начнется через ${data.minutesUntil} минут`,
        metadata: { callId: data.callId }
      });
      
      toast('Напоминание о звонке', {
        description: `"${data.title}" начнется через ${data.minutesUntil} минут`,
        duration: 15000
      });
    };
    
    websocketService.connectCallNotifications(handleCallStarting, handleCallReminder);
    
    return () => {
      websocketService.disconnectCallNotifications();
    };
  }, [addNotification]);

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
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showCallNotification,
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

