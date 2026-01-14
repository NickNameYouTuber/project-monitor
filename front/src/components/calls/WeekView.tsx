import React, { useMemo, useRef, useEffect } from 'react';
import { Box, Flex, Grid, Text } from '@nicorp/nui';
import { CallResponse } from '../../api/calls';
import CallCard from './CallCard';

interface WeekViewProps {
  currentDate: Date;
  calls: CallResponse[];
  onDateChange: (date: Date) => void;
  onCallClick: (call: CallResponse) => void;
  calendarView?: 'month' | 'week';
  onCalendarViewChange?: (view: 'month' | 'week') => void;
  activeTab?: 'calendar' | 'list';
  onTabChange?: (tab: 'calendar' | 'list') => void;
}

const DAYS_OF_WEEK_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  calls,
  onDateChange,
  onCallClick,
  calendarView = 'week',
  onCalendarViewChange,
  activeTab = 'calendar',
  onTabChange
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

    console.log('WeekView: всего звонков для отображения:', calls.length, calls);

    weekDays.forEach(day => {
      const dateKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      map.set(dateKey, []);
    });

    calls.forEach(call => {
      // Используем scheduled_time или start_at
      const timeStr = call.scheduled_time || call.start_at;
      if (!timeStr) {
        console.log('WeekView: звонок без scheduled_time и start_at:', call);
        return;
      }

      const date = new Date(timeStr);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

      console.log(`WeekView: добавляем звонок "${call.title}" на дату ${dateKey} (источник: ${call.scheduled_time ? 'scheduled_time' : 'start_at'})`, call);

      if (map.has(dateKey)) {
        map.get(dateKey)!.push(call);
      }
    });

    console.log('WeekView: итоговая карта звонков по дням:', map);

    return map;
  }, [calls, weekDays]);

  // Вычисляем наложения для каждого дня
  const callsWithLayout = useMemo(() => {
    const result = new Map<string, Array<CallResponse & { column: number; columnSpan: number; }>>();

    callsByDay.forEach((dayCalls, dateKey) => {
      const sorted = [...dayCalls].sort((a, b) => {
        const strA = a.scheduled_time || a.start_at;
        const strB = b.scheduled_time || b.start_at;
        const timeA = strA ? new Date(strA).getTime() : 0;
        const timeB = strB ? new Date(strB).getTime() : 0;
        return timeA - timeB;
      });

      const layout: Array<CallResponse & { column: number; columnSpan: number; }> = [];

      sorted.forEach(call => {
        const timeStr = call.scheduled_time || call.start_at;
        const startTime = timeStr ? new Date(timeStr) : new Date();
        const endTime = new Date(startTime.getTime() + (call.duration_minutes || 30) * 60000);

        // Находим свободную колонку
        let column = 0;
        let foundConflict = true;

        while (foundConflict) {
          foundConflict = false;

          for (const existing of layout) {
            if (existing.column !== column) continue;

            const existingTimeStr = existing.scheduled_time || existing.start_at;
            const existingStart = existingTimeStr ? new Date(existingTimeStr) : new Date();
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
    const timeStr = call.scheduled_time || call.start_at;
    if (!timeStr) return { top: 0, height: 90 };

    const date = new Date(timeStr);
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Масштаб 1.5x: 90px на час вместо 60px
    const top = (hours * 90 + minutes * 1.5);
    const height = (call.duration_minutes || 30) * 1.5;

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
      // Масштаб 1.5x: 90px на час вместо 60px
      const currentPosition = now.getHours() * 90 + now.getMinutes() * 1.5;
      containerRef.current.scrollTop = currentPosition - 180; // -2 часа для контекста (120 * 1.5)
    }
  }, []);

  const getCurrentTimePosition = () => {
    const now = new Date();
    // Масштаб 1.5x: 90px на час вместо 60px
    return now.getHours() * 90 + now.getMinutes() * 1.5;
  };

  return (
    <Box className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
      {/* Week Grid */}
      <Box className="flex-1 overflow-y-auto overflow-x-auto min-h-0" ref={containerRef}>
        <Grid className="grid-cols-[80px_repeat(7,1fr)] min-h-full">
          {/* Time column */}
          <Box className="border-r border-border sticky left-0 bg-background z-10">
            <Box className="h-12 border-b border-border bg-background" /> {/* Header spacer */}
            {HOURS.map(hour => (
              <Box key={hour} className="h-[90px] border-b border-border px-2 py-1 text-xs text-muted-foreground bg-background">
                {hour.toString().padStart(2, '0')}:00
              </Box>
            ))}
          </Box>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => {
            const dateKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const dayCalls = callsWithLayout.get(dateKey) || [];
            const today = isToday(day);

            return (
              <Box key={dayIndex} className="border-r border-border relative">
                {/* Day header */}
                <Flex className={`
                  h-12 border-b border-border flex-col items-center justify-center sticky top-0 z-10
                  ${today ? 'bg-blue-100/90 dark:bg-blue-900/90 backdrop-blur-sm' : 'bg-background'}
                `}>
                  <Text className="text-xs text-muted-foreground">{DAYS_OF_WEEK_FULL[dayIndex].slice(0, 3)}</Text>
                  <Text className={`text-sm font-medium ${today ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {day.getDate()}
                  </Text>
                </Flex>

                {/* Hour rows */}
                {HOURS.map(hour => (
                  <Box key={hour} className="h-[90px] border-b border-border" />
                ))}

                {/* Calls */}
                {dayCalls.map((call, index) => {
                  const { top, height } = getCallPosition(call);
                  const widthPercent = 100 / call.columnSpan;
                  const leftPercent = (call.column / call.columnSpan) * 100;

                  return (
                    <Box
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
                    </Box>
                  );
                })}

                {/* Current time indicator */}
                {today && (
                  <Box
                    className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
                    style={{
                      top: `${getCurrentTimePosition() + 48}px`
                    }}
                  >
                    <Box className="w-2 h-2 rounded-full bg-red-500 -mt-0.5 -ml-1" />
                  </Box>
                )}
              </Box>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
};

export default WeekView;

