import React from 'react';

interface CalendarViewContainerProps {
  children: React.ReactNode;
}

/**
 * Контейнер для календарных view с правильной высотой и скроллом
 */
const CalendarViewContainer: React.FC<CalendarViewContainerProps> = ({ children }) => {
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {children}
    </div>
  );
};

export default CalendarViewContainer;

