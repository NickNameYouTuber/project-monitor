import React from 'react';

interface Props {
  children: React.ReactNode;
}

// Обёртка, фиксирующая высоту в рамках экрана и предоставляющая внутренние скроллы
const CalendarContainer: React.FC<Props> = ({ children }) => {
  return (
    <div className="relative h-full min-h-0 flex flex-col overflow-hidden">
      {children}
    </div>
  );
};

export default CalendarContainer;
