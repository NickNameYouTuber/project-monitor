// User related types
export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  type?: 'guest' | 'telegram';
  token?: string;
  telegram_id?: number;
}

// Project related types
export type ProjectStatus = 'inPlans' | 'inProgress' | 'onPause' | 'completed';
export type ProjectPriority = 'high' | 'medium' | 'low';

export interface Project {
  id: string; // Changed to string for UUID
  name: string;
  description: string;
  assignee: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  order: number;
  createdAt: string;
}

// Drag & Drop types
export interface DraggedProject {
  element: HTMLElement;
  position?: 'above' | 'below';
}

// Telegram WebApp types
export interface TelegramWebApp {
  ready: () => void;
  initData: string;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
    auth_date?: number;
    hash?: string;
  };
}

// Dashboard related types
export interface Dashboard {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
}

export interface DashboardDetail extends Dashboard {
  projects: Project[];
}

export interface DashboardMember {
  id: string;
  dashboard_id: string;
  user_id: string;
  role: 'viewer' | 'editor' | 'admin';
  created_at: string;
  is_active: boolean;
  user?: User;
}

declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
}
