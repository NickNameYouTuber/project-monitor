import React, { useMemo, useRef, useEffect } from 'react';
import { CallResponse } from '../../api/calls';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CallCard from './CallCard';
import { Button } from '../ui/button';

interface WeekViewProps {
  currentDate: Date;
  calls: CallResponse[];
  onDateChange: (date: Date) => void;
  onCallClick: (call: CallResponse) => void;
  calendarView?: 'month' | 'week';
  onCalendarViewChange?: (view: 'month' | 'week') => void;
}

const DAYS_OF_WEEK_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const WeekView: React.FC<WeekViewProps> = ({ 
  currentDate, 
  calls, 
  onDateChange,
  onCallClick,
  calendarView = 'week',
  onCalendarViewChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Получаем дни недели начиная с понедельника
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    start.setDate(diff);
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  }, [currentDate]);

  // Группируем звонки по дням
  const callsByDay = useMemo(() => {
    const map = new Map<string, CallResponse[]>();
    
    weekDays.forEach(day => {
      const dateKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      map.set(dateKey, []);
    });
    
    calls.forEach(call => {
      if (!call.scheduled_time) return;
      
      const date = new Date(call.scheduled_time);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      
      if (map.has(dateKey)) {
        map.get(dateKey)!.push(call);
      }
    });
    
    return map;
  }, [calls, weekDays]);

  // Вычисляем наложения для каждого дня
  const callsWithLayout = useMemo(() => {
    const result = new Map<string, Array<CallResponse & { column: number; columnSpan: number; }>>();
    
    callsByDay.forEach((dayCalls, dateKey) => {
      const sorted = [...dayCalls].sort((a, b) => {
        const timeA = a.scheduled_time ? new Date(a.scheduled_time).getTime() : 0;
        const timeB = b.scheduled_time ? new Date(b.scheduled_time).getTime() : 0;
        return timeA - timeB;
      });
      
      const layout: Array<CallResponse & { column: number; columnSpan: number; }> = [];
      
      sorted.forEach(call => {
        const startTime = call.scheduled_time ? new Date(call.scheduled_time) : new Date();
        const endTime = new Date(startTime.getTime() + (call.duration_minutes || 30) * 60000);
        
        // Находим свободную колонку
        let column = 0;
        let foundConflict = true;
        
        while (foundConflict) {
          foundConflict = false;
          
          for (const existing of layout) {
            if (existing.column !== column) continue;
            
            const existingStart = existing.scheduled_time ? new Date(existing.scheduled_time) : new Date();
            const existingEnd = new Date(existingStart.getTime() + (existing.duration_minutes || 30) * 60000);
            
            // Проверка наложения
            if (startTime < existingEnd && endTime > existingStart) {
              foundConflict = true;
              column++;
              break;
            }
          }
        }
        
        layout.push({ ...call, column, columnSpan: 1 });
      });
      
      // Вычисляем максимальное количество колонок для каждого временного слота
      const maxColumns = Math.max(1, ...layout.map(c => c.column + 1));
      
      // Обновляем columnSpan
      layout.forEach(call => {
        call.columnSpan = maxColumns;
      });
      
      result.set(dateKey, layout);
    });
    
    return result;
  }, [callsByDay]);

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };

  const formatDateRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.getDate()} ${getMonthName(start.getMonth())} - ${end.getDate()} ${getMonthName(end.getMonth())} ${end.getFullYear()}`;
  };

  const getMonthName = (month: number) => {
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return months[month];
  };

  const getCallPosition = (call: CallResponse) => {
    if (!call.scheduled_time) return { top: 0, height: 60 };
    
    const date = new Date(call.scheduled_time);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    const top = (hours * 60 + minutes);
    const height = (call.duration_minutes || 30);
    
    return { top, height };
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Прокрутка к текущему времени
  useEffect(() => {
    if (containerRef.current) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      containerRef.current.scrollTop = currentMinutes - 120; // -2 часа для контекста
    }
  }, []);

  const getCurrentTimePosition = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevWeek}
            className="p-2 hover:bg-accent rounded-lg transition"
            aria-label="Предыдущая неделя"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">
            {formatDateRange()}
          </h2>
          <button
            onClick={handleNextWeek}
            className="p-2 hover:bg-accent rounded-lg transition"
            aria-label="Следующая неделя"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Переключатель месяц/неделя */}
          {onCalendarViewChange && (
            <div className="flex items-center gap-2 border-l pl-4 ml-2">
              <Button
                variant={calendarView === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onCalendarViewChange('month')}
              >
                Месяц
              </Button>
              <Button
                variant={calendarView === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onCalendarViewChange('week')}
              >
                Неделя
              </Button>
            </div>
          )}
        </div>

        {/* Легенда статусов */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Предстоящие</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Сейчас</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">Завершенные</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Отмененные</span>
          </div>
        </div>
      </div>

      {/* Week Grid */}
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0" ref={containerRef}>
        <div className="grid grid-cols-[80px_repeat(7,1fr)] min-h-full">
          {/* Time column */}
          <div className="border-r border-border sticky left-0 bg-background z-10">
            <div className="h-12 border-b border-border" /> {/* Header spacer */}
            {HOURS.map(hour => (
              <div key={hour} className="h-[60px] border-b border-border px-2 py-1 text-xs text-muted-foreground">
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => {
            const dateKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const dayCalls = callsWithLayout.get(dateKey) || [];
            const today = isToday(day);
            
            return (
              <div key={dayIndex} className="border-r border-border relative">
                {/* Day header */}
                <div className={`
                  h-12 border-b border-border flex flex-col items-center justify-center sticky top-0 bg-background z-10
                  ${today ? 'bg-blue-50 dark:bg-blue-950/20' : ''}
                `}>
                  <div className="text-xs text-muted-foreground">{DAYS_OF_WEEK_FULL[dayIndex].slice(0, 3)}</div>
                  <div className={`text-sm font-medium ${today ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {day.getDate()}
                  </div>
                </div>

                {/* Hour rows */}
                {HOURS.map(hour => (
                  <div key={hour} className="h-[60px] border-b border-border" />
                ))}

                {/* Calls */}
                {dayCalls.map((call, index) => {
                  const { top, height } = getCallPosition(call);
                  const widthPercent = 100 / call.columnSpan;
                  const leftPercent = (call.column / call.columnSpan) * 100;
                  
                  return (
                    <div
                      key={index}
                      className="absolute px-0.5"
                      style={{
                        top: `${top + 48}px`, // +48px for header
                        height: `${height}px`,
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        zIndex: 5
                      }}
                    >
                      <CallCard call={call} onClick={() => onCallClick(call)} compact />
                    </div>
                  );
                })}

                {/* Current time indicator */}
                {today && (
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
                    style={{
                      top: `${getCurrentTimePosition() + 48}px`
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 -mt-0.5 -ml-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeekView;

