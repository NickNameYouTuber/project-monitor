import React from 'react';
import MonthView from './MonthView';
import WeekView from './WeekView';
import { CallResponse } from '../../api/calls';

interface CalendarViewContainerProps {
  calendarView: 'month' | 'week';
  currentDate: Date;
  calls: CallResponse[];
  onDateChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
  onCallClick: (call: CallResponse) => void;
}

/**
 * Контейнер для календарных представлений с правильной обработкой высоты и скролла
 */
const CalendarViewContainer: React.FC<CalendarViewContainerProps> = ({
  calendarView,
  currentDate,
  calls,
  onDateChange,
  onDayClick,
  onCallClick,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col">
      {calendarView === 'month' ? (
        <MonthView 
          currentDate={currentDate}
          calls={calls}
          onDateChange={onDateChange}
          onDayClick={onDayClick}
        />
      ) : (
        <WeekView 
          currentDate={currentDate}
          calls={calls}
          onDateChange={onDateChange}
          onCallClick={onCallClick}
        />
      )}
    </div>
  );
};

export default CalendarViewContainer;

