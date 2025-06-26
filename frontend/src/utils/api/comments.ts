import { v4 as uuidv4 } from 'uuid';

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CommentCreate {
  task_id: string;
  content: string;
}

export interface CommentUpdate {
  content: string;
}

/**
 * Локальная реализация API комментариев с использованием localStorage
 * поскольку бэкенд для комментариев отсутствует
 */
const STORAGE_KEY = 'project-monitor-comments';

// Получить все комментарии из localStorage
const getAllComments = (): Comment[] => {
  try {
    const comments = localStorage.getItem(STORAGE_KEY);
    return comments ? JSON.parse(comments) : [];
  } catch (error) {
    console.error('Error getting comments from localStorage:', error);
    return [];
  }
};

// Сохранить все комментарии в localStorage
const saveAllComments = (comments: Comment[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  } catch (error) {
    console.error('Error saving comments to localStorage:', error);
  }
};

const commentsApi = {
  // Получить комментарии для задачи
  getByTask: async (taskId: string, _token: string): Promise<Comment[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const comments = getAllComments().filter(comment => comment.task_id === taskId);
        resolve(comments);
      }, 300); // Имитация задержки сети
    });
  },

  // Создать новый комментарий
  create: async (commentData: CommentCreate, _token: string): Promise<Comment> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Получаем информацию о пользователе из localStorage
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const username = currentUser.username || 'Anonymous';
        
        const newComment: Comment = {
          id: uuidv4(),
          user_id: currentUser.id || 'local-user',
          username,
          task_id: commentData.task_id,
          content: commentData.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const comments = getAllComments();
        comments.push(newComment);
        saveAllComments(comments);
        
        resolve(newComment);
      }, 300); // Имитация задержки сети
    });
  },

  // Обновить комментарий
  update: async (commentId: string, updateData: CommentUpdate, _token: string): Promise<Comment> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const comments = getAllComments();
        const index = comments.findIndex(c => c.id === commentId);
        
        if (index === -1) {
          reject(new Error('Comment not found'));
          return;
        }
        
        const updatedComment = {
          ...comments[index],
          content: updateData.content,
          updated_at: new Date().toISOString()
        };
        
        comments[index] = updatedComment;
        saveAllComments(comments);
        
        resolve(updatedComment);
      }, 300); // Имитация задержки сети
    });
  },

  // Удалить комментарий
  delete: async (commentId: string, _token: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const comments = getAllComments();
        const filteredComments = comments.filter(c => c.id !== commentId);
        saveAllComments(filteredComments);
        resolve();
      }, 300); // Имитация задержки сети
    });
  }
};

export default commentsApi;
