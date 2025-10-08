import React from 'react';

interface CalendarContainerProps {
  children: React.ReactNode;
}

const CalendarContainer: React.FC<CalendarContainerProps> = ({ children }) => {
  return (
    <div className="relative h-full min-h-0">
      <div className="absolute inset-0 overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default CalendarContainer;
