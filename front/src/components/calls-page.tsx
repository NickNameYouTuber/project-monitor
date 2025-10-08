import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus,
} from 'lucide-react';
import { Button } from './ui/button';
import NewMeetingDialog from './calls/NewMeetingDialog';
import UpcomingOverlay from './calls/UpcomingOverlay';
import CallPage from '../features/call/pages/CallPage';
import MeetingsList from './calls/MeetingsList';
import UpcomingPanel from './calls/UpcomingPanel';
import SearchBar from './calls/SearchBar';
import MonthView from './calls/MonthView';
import WeekView from './calls/WeekView';
import CalendarContainer from './calls/CalendarContainer';
import { listCalls, createCall, getCallsInRange, CallResponse } from '../api/calls';

interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration: number;
  participants: string[];
  type: 'video' | 'audio';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  description?: string;
  color?: string;
  roomId?: string;
}

// Predefined meeting colors with transparency
const MEETING_COLORS = [
  { name: 'Purple', value: 'rgba(99, 102, 241, 0.8)', bg: 'bg-indigo-500/80' },
  { name: 'Blue', value: 'rgba(59, 130, 246, 0.8)', bg: 'bg-blue-500/80' },
  { name: 'Green', value: 'rgba(34, 197, 94, 0.8)', bg: 'bg-green-500/80' },
  { name: 'Orange', value: 'rgba(249, 115, 22, 0.8)', bg: 'bg-orange-500/80' },
  { name: 'Rose', value: 'rgba(244, 63, 94, 0.8)', bg: 'bg-rose-500/80' },
  { name: 'Violet', value: 'rgba(139, 92, 246, 0.8)', bg: 'bg-violet-500/80' },
  { name: 'Cyan', value: 'rgba(56, 189, 248, 0.8)', bg: 'bg-cyan-500/80' },
];

export function CallsPage() {
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([
  {
    id: '1',
      title: 'Daily Standup',
      date: new Date(new Date().setHours(9, 0, 0, 0)),
    duration: 30,
      participants: ['John Doe', 'Jane Smith'],
    type: 'video',
    status: 'scheduled',
    color: MEETING_COLORS[0].value,
    roomId: 'test-room-1'
  },
  {
    id: '2',
    title: 'Project Review',
      date: new Date(new Date().setHours(14, 30, 0, 0)),
    duration: 60,
      participants: ['Mike Johnson', 'Sarah Wilson'],
    type: 'video',
    status: 'scheduled',
    color: MEETING_COLORS[1].value,
    roomId: 'test-room-2'
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  // Calendar state
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarCalls, setCalendarCalls] = useState<CallResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    (async () => {
      try {
        // Создаем тестовый звонок для проверки календаря (только при первом запуске)
        const testCallExists = localStorage.getItem('testCallCreated');
        if (!testCallExists) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(14, 0, 0, 0);
          
          await createCall({
            room_id: 'test-calendar-room',
            title: 'Test Calendar Call',
            description: 'Тестовый звонок для проверки календаря',
            scheduled_time: tomorrow.toISOString(),
            duration_minutes: 60,
            status: 'SCHEDULED',
          }).then(() => {
            localStorage.setItem('testCallCreated', 'true');
            console.log('Тестовый звонок создан');
          }).catch(err => console.error('Ошибка создания тестового звонка:', err));
        }

        const fromApi = await listCalls();
        if (fromApi && fromApi.length) {
          const apiMeetings = fromApi.map(c => ({
            id: c.id,
            title: c.title || c.room_id,
            date: c.scheduled_time ? new Date(c.scheduled_time) : (c.start_at ? new Date(c.start_at) : new Date()),
            duration: c.duration_minutes || (c.end_at && c.start_at ? Math.max(1, Math.round((new Date(c.end_at).getTime() - new Date(c.start_at).getTime()) / 60000)) : 30),
            participants: [],
            type: 'video' as const,
            status: (c.status?.toLowerCase() || 'scheduled') as 'scheduled' | 'in-progress' | 'completed' | 'cancelled',
            color: MEETING_COLORS[1].value,
            roomId: c.room_id,
          }));
          setMeetings(prev => {
            // Объединяем API данные с локальными тестовыми, избегая дубликатов
            const testIds = prev.filter(m => m.id === '1' || m.id === '2').map(m => m.id);
            return [...prev.filter(m => testIds.includes(m.id)), ...apiMeetings];
          });
        }
      } catch {}
    })();
    if (roomId) {
      setIsInCall(true);
    }
  }, [roomId]);

  // Загрузка звонков для календаря
  useEffect(() => {
    (async () => {
      try {
        const start = new Date(currentDate);
        const end = new Date(currentDate);
        
        if (calendarView === 'month') {
          start.setDate(1);
          end.setMonth(end.getMonth() + 1, 0);
        } else {
          const day = start.getDay();
          const diff = start.getDate() - day + (day === 0 ? -6 : 1);
          start.setDate(diff);
          end.setDate(start.getDate() + 6);
        }
        
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
        console.log(`calls-page: загружаем звонки с ${start.toISOString()} по ${end.toISOString()}`);
        try {
          const calls = await getCallsInRange(start.toISOString(), end.toISOString());
          console.log('calls-page: получено звонков через /range:', calls.length, calls);
          setCalendarCalls(calls);
        } catch (rangeError) {
          console.warn('Ошибка /range, используем fallback /list:', rangeError);
          // Fallback: загружаем все звонки и фильтруем на клиенте
          const allCalls = await listCalls();
          const filtered = allCalls.filter(c => {
            // Используем scheduled_time или start_at
            const timeStr = c.scheduled_time || c.start_at;
            if (!timeStr) {
              console.log('calls-page: звонок без даты:', c);
              return false;
            }
            const callDate = new Date(timeStr);
            const inRange = callDate >= start && callDate <= end;
            console.log(`calls-page: звонок "${c.title}" (${timeStr}) в диапазоне? ${inRange}`, {
              callDate: callDate.toISOString(),
              start: start.toISOString(),
              end: end.toISOString()
            });
            return inRange;
          });
          console.log('calls-page: получено звонков через fallback:', filtered.length, filtered);
          setCalendarCalls(filtered);
        }
      } catch (error) {
        console.error('Ошибка загрузки звонков для календаря:', error);
      }
    })();
  }, [currentDate, calendarView]);
  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false);

  const [newMeeting, setNewMeeting] = useState({
    title: '',
    date: new Date(),
    time: '09:00',
    duration: 30,
    type: 'video' as 'video' | 'audio',
    description: '',
    participants: '',
    color: MEETING_COLORS[0].value
  });

  const upcomingMeetings = meetings
    .filter(meeting => meeting.date > new Date() && meeting.status === 'scheduled')
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const handleCreateMeeting = () => {
    const [hours, minutes] = newMeeting.time.split(':').map(Number);
    const meetingDate = new Date(newMeeting.date);
    meetingDate.setHours(hours, minutes);

    const roomId = Date.now().toString();
    const meeting: Meeting = {
      id: Date.now().toString(),
      title: newMeeting.title,
      date: meetingDate,
      duration: newMeeting.duration,
      participants: newMeeting.participants.split(',').map(p => p.trim()).filter(Boolean),
      type: newMeeting.type,
      status: 'scheduled',
      description: newMeeting.description,
      color: newMeeting.color,
      roomId,
    };

    setMeetings(prev => [...prev, meeting]);
    // Пишем на бэк
    try {
      createCall({
        room_id: roomId,
        title: meeting.title,
        description: meeting.description,
        start_at: meeting.date.toISOString(),
        end_at: new Date(meetingDate.getTime() + meeting.duration * 60000).toISOString(),
        scheduled_time: meeting.date.toISOString(),
        duration_minutes: meeting.duration,
        status: 'SCHEDULED',
      }).catch(()=>{});
    } catch {}
    setNewMeeting({
      title: '',
      date: new Date(),
      time: '09:00',
      duration: 30,
      type: 'video',
      description: '',
      participants: '',
      color: MEETING_COLORS[0].value
    });
    setIsCreateMeetingOpen(false);
  };

  const handleCancelMeeting = async (meetingId: string) => {
    setMeetings(prev => prev.map(meeting => 
      meeting.id === meetingId 
        ? { ...meeting, status: 'cancelled' as const }
        : meeting
    ));
    try {
      const leaveBtn = document.getElementById('ctrlLeave') as HTMLButtonElement | null;
      if (leaveBtn) leaveBtn.click();
    } catch {}
  }; 

  const startCall = (meeting?: Meeting) => {
    if (meeting) {
      navigate(`/call/${meeting.roomId || meeting.id}`);
    } else {
      const rid = Date.now().toString();
      navigate(`/call/${rid}`);
    }
  };

  const endCall = () => {
    setIsInCall(false);
    navigate('/calls');
  };

  if (isInCall) {
    return (
      <div className="h-full w-full">
        <CallPage />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header - фиксированная высота */}
      <div className="flex-none border-b border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1>Calls & Meetings</h1>
            <p className="text-muted-foreground">Schedule and manage your team meetings</p>
          </div>
          <Button onClick={() => setIsCreateMeetingOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Meeting
          </Button>
          <NewMeetingDialog open={isCreateMeetingOpen} setOpen={setIsCreateMeetingOpen} newMeeting={newMeeting} setNewMeeting={setNewMeeting} colors={MEETING_COLORS} onCreate={handleCreateMeeting} />
        </div>
        
        <SearchBar value={searchQuery} onChange={setSearchQuery} onToggleUpcoming={() => setIsUpcomingOpen(!isUpcomingOpen)} upcomingCount={upcomingMeetings.length} />
      </div>

      {/* Content area - растягивается на оставшееся пространство */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        
        {/* Tabs content - растягивается на оставшееся пространство */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'calendar' ? (
            <CalendarContainer>
              {calendarView === 'month' ? (
                <MonthView 
                  currentDate={currentDate}
                  calls={calendarCalls}
                  onDateChange={setCurrentDate}
                  onDayClick={(date) => {
                    setCurrentDate(date);
                    setCalendarView('week');
                  }}
                  calendarView={calendarView}
                  onCalendarViewChange={setCalendarView}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              ) : (
                <WeekView 
                  currentDate={currentDate}
                  calls={calendarCalls}
                  onDateChange={setCurrentDate}
                  onCallClick={(call) => {
                    if (call.room_id) {
                      navigate(`/call/${call.room_id}`);
                    }
                  }}
                  calendarView={calendarView}
                  onCalendarViewChange={setCalendarView}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              )}
            </CalendarContainer>
          ) : (
            <MeetingsList 
              items={meetings} 
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onJoinCall={(roomId) => navigate(`/call/${roomId}`)}
            />
          )}
        </div>

        {/* Sliding Upcoming Meetings Panel */}
        <UpcomingPanel open={isUpcomingOpen} onClose={() => setIsUpcomingOpen(false)} items={upcomingMeetings} onStart={(id) => {
          const m = meetings.find(mm => mm.id === id);
          startCall(m);
        }} />
        
        {/* Overlay when panel is open */}
        <UpcomingOverlay open={isUpcomingOpen} onClick={() => setIsUpcomingOpen(false)} />
      </div>
    </div>
  );
}