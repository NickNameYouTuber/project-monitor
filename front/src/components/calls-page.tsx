import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import NewMeetingDialog from './calls/NewMeetingDialog';
import UpcomingOverlay from './calls/UpcomingOverlay';
import CallPage from './call/CallPage';
import Initializer from './calls/Initializer';
import MeetingsList from './calls/MeetingsList';
import UpcomingPanel from './calls/UpcomingPanel';
import SearchBar from './calls/SearchBar';
import { listCalls, createCall } from '../api/calls';

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
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await listCalls();
        const mapped: Meeting[] = data.map(c => ({
          id: c.id,
          title: c.title,
          date: c.scheduled_start ? new Date(c.scheduled_start) : new Date(),
          duration: c.duration_minutes || 30,
          participants: [],
          type: 'video',
          status: 'scheduled',
          color: MEETING_COLORS[0].value,
          description: c.description || ''
        }));
        setMeetings(mapped);
      } catch {}
    })();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const { roomId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (roomId) {
      setIsInCall(true);
    }
  }, [roomId]);
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

  const handleCreateMeeting = async () => {
    const [hours, minutes] = newMeeting.time.split(':').map(Number);
    const meetingDate = new Date(newMeeting.date);
    meetingDate.setHours(hours, minutes);

    try {
      const created = await createCall({
        title: newMeeting.title || 'Untitled',
        description: newMeeting.description || '',
        scheduled_start: meetingDate.toISOString(),
        duration_minutes: newMeeting.duration,
        participant_ids: [],
      });
      setMeetings(prev => [
        ...prev,
        {
          id: created.id,
          title: created.title,
          date: created.scheduled_start ? new Date(created.scheduled_start) : meetingDate,
          duration: created.duration_minutes || newMeeting.duration,
          participants: [],
          type: 'video',
      status: 'scheduled',
      description: newMeeting.description,
      color: newMeeting.color
        }
      ]);
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
      navigate(`/prejoin/${meeting.id}`, { state: { title: meeting.title, start: meeting.date.toISOString(), duration: meeting.duration } });
    } else {
      navigate('/prejoin/test');
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
        <Initializer roomId={roomId} onLeave={endCall} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6 shrink-0">
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

      <div className="flex-1 relative min-h-0">
        <Tabs defaultValue="calendar" className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between border-b bg-background p-4 shrink-0">
            <TabsList className="justify-start rounded-none bg-transparent p-0">
              <TabsTrigger value="calendar" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Calendar View
              </TabsTrigger>
              <TabsTrigger value="list" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                List View
              </TabsTrigger>
            </TabsList>
            
            {/* Upcoming Meetings Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUpcomingOpen(!isUpcomingOpen)}
              className="flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Upcoming ({upcomingMeetings.length})
              <ChevronRight className={`w-4 h-4 transition-transform ${isUpcomingOpen ? 'rotate-180' : ''}`} />
            </Button>
          </div>
          
          {/* Calendar view removed */}
          
          <TabsContent value="list" className="flex-1 min-h-0 m-0 p-6">
            <MeetingsList items={meetings} />
          </TabsContent>
        </Tabs>

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