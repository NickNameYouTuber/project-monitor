import React from 'react';
import { Box } from '@nicorp/nui';

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
    <Box className="absolute inset-0 flex flex-col overflow-hidden">
      {children}
    </Box>
  );
};

export default CalendarContainer;
