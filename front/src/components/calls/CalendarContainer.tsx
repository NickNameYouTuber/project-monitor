import React from 'react';

interface Props {
  children: React.ReactNode;
}

/**
 * Контейнер календаря с жёсткой фиксацией высоты
 * Предотвращает переполнение за пределы viewport
 * Предоставляет контекст для внутренних скроллов
 */
const CalendarContainer: React.FC<Props> = ({ children }) => {
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {children}
    </div>
  );
};

export default CalendarContainer;
