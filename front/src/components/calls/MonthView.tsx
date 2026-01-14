import React, { useMemo } from 'react';
import { Box, Flex, Grid, Text } from '@nicorp/nui';
import { CallResponse } from '../../api/calls';

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
      // Если время прошло - это завершенный
      if (now >= endTime) {
        return 'completed';
      }
    }

    return apiStatus || 'scheduled';
  };

  const getCallCountByStatus = (dateCalls: CallResponse[]) => {
    return {
      scheduled: dateCalls.filter(c => getActualStatus(c) === 'scheduled').length,
      active: dateCalls.filter(c => getActualStatus(c) === 'active').length,
      completed: dateCalls.filter(c => getActualStatus(c) === 'completed').length,
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
    <Box className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
      {/* Calendar Grid */}
      <Box className="flex-1 overflow-y-auto overflow-x-hidden p-6 min-h-0">
        <Grid className="grid-cols-7 h-full min-h-[600px]">
          {/* День недели headers */}
          {DAYS_OF_WEEK.map(day => (
            <Box key={day} className="text-center py-2 font-medium text-sm text-muted-foreground border-b border-border bg-background sticky top-0 z-10">
              {day}
            </Box>
          ))}

          {/* Days */}
          {monthDays.map((date, index) => {
            const dateCalls = getCallsForDate(date);
            const counts = getCallCountByStatus(dateCalls);
            const today = isToday(date);

            return (
              <Box
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
                    <Box className={`text-sm font-medium mb-2 ${today ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                      {date.getDate()}
                    </Box>

                    {/* Call indicators - показываем первые 3 звонка */}
                    {dateCalls.length > 0 && (
                      <Box className="space-y-1">
                        {dateCalls.slice(0, 3).map((call) => {
                          const timeStr = call.scheduled_time || call.start_at;
                          const time = timeStr ? new Date(timeStr) : null;
                          const timeFormatted = time ? `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}` : '';

                          return (
                            <Box
                              key={call.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onCallClick?.(call);
                              }}
                              className="text-xs truncate px-1.5 py-0.5 rounded hover:bg-accent/50 transition cursor-pointer border-l-2"
                              style={{
                                borderLeftColor:
                                  getActualStatus(call) === 'active' ? '#3b82f6' :
                                    getActualStatus(call) === 'completed' ? '#eab308' :
                                      getActualStatus(call) === 'cancelled' ? '#ef4444' : '#22c55e'
                              }}
                            >
                              <Text as="span" className="font-medium">{timeFormatted}</Text> {call.title || 'Без названия'}
                            </Box>
                          );
                        })}
                        {dateCalls.length > 3 && (
                          <div className="text-xs text-muted-foreground px-1.5">
                            +{dateCalls.length - 3} ещё
                          </div>
                        )}
                      </Box>
                    )}
                  </>
                )}
              </Box>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
};

export default MonthView;

