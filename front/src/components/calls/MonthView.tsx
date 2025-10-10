import React, { useMemo } from 'react';
import { CallResponse } from '../../api/calls';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface MonthViewProps {
  currentDate: Date;
  calls: CallResponse[];
  onDateChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
  onCallClick?: (call: CallResponse) => void;
  calendarView?: 'month' | 'week';
  onCalendarViewChange?: (view: 'month' | 'week') => void;
  activeTab?: 'calendar' | 'list';
  onTabChange?: (tab: 'calendar' | 'list') => void;
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
  onDayClick,
  onCallClick,
  calendarView = 'month',
  onCalendarViewChange,
  activeTab = 'calendar',
  onTabChange
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
    
    console.log('MonthView: всего звонков для отображения:', calls.length, calls);
    
    calls.forEach(call => {
      // Используем scheduled_time или start_at
      const timeStr = call.scheduled_time || call.start_at;
      if (!timeStr) {
        console.log('MonthView: звонок без scheduled_time и start_at:', call);
        return;
      }
      
      const date = new Date(timeStr);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      
      console.log(`MonthView: добавляем звонок "${call.title}" на дату ${dateKey} (источник: ${call.scheduled_time ? 'scheduled_time' : 'start_at'})`, call);
      
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(call);
    });
    
    console.log('MonthView: итоговая карта звонков:', map);
    
    return map;
  }, [calls]);

  const getCallsForDate = (date: Date | null): CallResponse[] => {
    if (!date) return [];
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return callsByDate.get(dateKey) || [];
  };

  // Вычисляем актуальный статус на основе времени
  const getActualStatus = (call: CallResponse): string => {
    const now = new Date();
    const apiStatus = call.status?.toLowerCase();
    
    // Если API говорит completed/cancelled - верим ему
    if (apiStatus === 'completed' || apiStatus === 'cancelled') {
      return apiStatus;
    }
    
    const timeStr = call.scheduled_time || call.start_at;
    if (!timeStr) return apiStatus || 'scheduled';
    
    const startTime = new Date(timeStr);
    const endTime = new Date(startTime.getTime() + (call.duration_minutes || 30) * 60000);
    
    // Если API говорит active/in-progress, проверяем что время корректное
    if (apiStatus === 'active' || apiStatus === 'in-progress') {
      // Проверяем что NOW находится между началом и концом
      if (startTime <= now && now < endTime) {
        return 'active';
      }
      // Если время прошло, но статус active - это ошибка, считаем completed
      if (now >= endTime) {
        return 'completed';
      }
      // Если время еще не наступило, но статус active - оставляем scheduled
      return 'scheduled';
    }
    
    // Если scheduled, проверяем время
    if (apiStatus === 'scheduled') {
      // Если время в диапазоне [start, end) - должно быть active
      if (startTime <= now && now < endTime) {
        return 'active';
      }
      // Если время прошло - это прошедший
      if (now >= endTime) {
        return 'past';
      }
    }
    
    return apiStatus || 'scheduled';
  };

  const getCallCountByStatus = (dateCalls: CallResponse[]) => {
    return {
      scheduled: dateCalls.filter(c => getActualStatus(c) === 'scheduled').length,
      active: dateCalls.filter(c => getActualStatus(c) === 'active').length,
      completed: dateCalls.filter(c => {
        const status = getActualStatus(c);
        return status === 'completed' || status === 'past';
      }).length,
      cancelled: dateCalls.filter(c => getActualStatus(c) === 'cancelled').length,
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          {/* Табы Calendar / List */}
          {onTabChange && (
            <div className="flex items-center rounded-none bg-transparent p-0 mr-2">
              <button
                onClick={() => onTabChange('calendar')}
                className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium transition-all rounded-none border-b-2 ${
                  activeTab === 'calendar'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => onTabChange('list')}
                className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium transition-all rounded-none border-b-2 ${
                  activeTab === 'list'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                List
              </button>
            </div>
          )}

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

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 min-h-0">
        <div className="grid grid-cols-7 h-full min-h-[600px]">
          {/* День недели headers */}
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="text-center py-2 font-medium text-sm text-muted-foreground border-b border-border bg-background sticky top-0 z-10">
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
                    
                    {/* Call indicators - показываем первые 3 звонка */}
                    {dateCalls.length > 0 && (
                      <div className="space-y-1">
                        {dateCalls.slice(0, 3).map((call) => {
                          const timeStr = call.scheduled_time || call.start_at;
                          const time = timeStr ? new Date(timeStr) : null;
                          const timeFormatted = time ? `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}` : '';
                          
                          return (
                            <div
                              key={call.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onCallClick?.(call);
                              }}
                              className="text-xs truncate px-1.5 py-0.5 rounded hover:bg-accent/50 transition cursor-pointer border-l-2"
                              style={{
                                borderLeftColor: 
                                  getActualStatus(call) === 'active' ? '#3b82f6' :
                                  getActualStatus(call) === 'completed' || getActualStatus(call) === 'past' ? '#eab308' :
                                  getActualStatus(call) === 'cancelled' ? '#ef4444' : '#22c55e'
                              }}
                            >
                              <span className="font-medium">{timeFormatted}</span> {call.title || 'Без названия'}
                            </div>
                          );
                        })}
                        {dateCalls.length > 3 && (
                          <div className="text-xs text-muted-foreground px-1.5">
                            +{dateCalls.length - 3} ещё
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

