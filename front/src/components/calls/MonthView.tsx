import React, { useMemo } from 'react';
import { CallResponse } from '../../api/calls';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  calls: CallResponse[];
  onDateChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
}

const DAYS_OF_WEEK = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const MonthView: React.FC<MonthViewProps> = ({ 
  currentDate, 
  calls, 
  onDateChange,
  onDayClick 
}) => {
  // Получаем дни месяца
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Первый день месяца
    const firstDay = new Date(year, month, 1);
    // Последний день месяца
    const lastDay = new Date(year, month + 1, 0);
    
    // Начинаем с понедельника (0 = воскресенье, 1 = понедельник)
    let startDay = firstDay.getDay() - 1;
    if (startDay === -1) startDay = 6;
    
    const days: (Date | null)[] = [];
    
    // Добавляем пустые ячейки до первого дня
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Добавляем дни месяца
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  }, [currentDate]);

  // Группируем звонки по дням
  const callsByDate = useMemo(() => {
    const map = new Map<string, CallResponse[]>();
    
    calls.forEach(call => {
      if (!call.scheduled_time) return;
      
      const date = new Date(call.scheduled_time);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(call);
    });
    
    return map;
  }, [calls]);

  const getCallsForDate = (date: Date | null): CallResponse[] => {
    if (!date) return [];
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return callsByDate.get(dateKey) || [];
  };

  const getCallCountByStatus = (dateCalls: CallResponse[]) => {
    return {
      scheduled: dateCalls.filter(c => c.status === 'SCHEDULED').length,
      active: dateCalls.filter(c => c.status === 'ACTIVE').length,
      completed: dateCalls.filter(c => c.status === 'COMPLETED').length,
      cancelled: dateCalls.filter(c => c.status === 'CANCELLED').length,
    };
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-accent rounded-lg transition"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-accent rounded-lg transition"
            aria-label="Следующий месяц"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 min-h-0">
        <div className="grid grid-cols-7 h-full min-h-[600px]">
          {/* День недели headers */}
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="text-center py-2 font-medium text-sm text-muted-foreground border-b border-border">
              {day}
            </div>
          ))}
          
          {/* Days */}
          {monthDays.map((date, index) => {
            const dateCalls = getCallsForDate(date);
            const counts = getCallCountByStatus(dateCalls);
            const today = isToday(date);
            
            return (
              <div
                key={index}
                className={`
                  border-r border-b border-border p-2 min-h-[120px] cursor-pointer
                  hover:bg-accent transition
                  ${!date ? 'bg-muted/30' : ''}
                  ${today ? 'bg-blue-50 dark:bg-blue-950/20' : ''}
                `}
                onClick={() => date && onDayClick(date)}
              >
                {date && (
                  <>
                    <div className={`text-sm font-medium mb-2 ${today ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                      {date.getDate()}
                    </div>
                    
                    {/* Call indicators */}
                    {dateCalls.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {counts.scheduled > 0 && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-xs">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-green-700 dark:text-green-300">{counts.scheduled}</span>
                          </div>
                        )}
                        {counts.active > 0 && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-blue-700 dark:text-blue-300">{counts.active}</span>
                          </div>
                        )}
                        {counts.completed > 0 && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            <span className="text-yellow-700 dark:text-yellow-300">{counts.completed}</span>
                          </div>
                        )}
                        {counts.cancelled > 0 && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 rounded text-xs">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-red-700 dark:text-red-300">{counts.cancelled}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MonthView;

