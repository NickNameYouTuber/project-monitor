/**
 * Конфигурация API для доступа к бэкенду
 */

// Проверяем, работает ли приложение в режиме разработки или продакшена
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// Используем разные базовые URL в зависимости от окружения
export const API_BASE_URL = isProduction
  ? '' // В продакшене используем относительные пути
  : import.meta.env.VITE_API_URL || 'http://localhost:7671'; // В dev-режиме используем абсолютные пути
