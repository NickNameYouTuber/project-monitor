import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Video, 
  Phone, 
  Users, 
  Plus,
  Search,
  Filter,
  Clock,
  Mic,
  MicOff,
  VideoOff,
  Monitor,
  PhoneCall,
  MessageCircle,
  Volume2,
  Settings,
  MoreVertical,
  Circle,
  StopCircle,
  Send,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calendar } from './ui/calendar';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { initCallConnect } from '../utils/call-connect';
import CallPage from './call/CallPage';

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

// WeeklyCalendarView removed by request

interface CallState {
  isInCall: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  isChatOpen: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
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

const SLOT_HEIGHT = 60;
const MIN_MEETING_HEIGHT = 20;

function ChatPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = () => {
    if (newMessage.trim()) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'You',
        message: newMessage.trim(),
        timestamp: new Date()
      }]);
      setNewMessage('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-4 top-4 bottom-20 w-80 bg-gray-800 rounded-lg flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-white font-medium">Chat</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4 text-white" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((message) => (
            <div key={message.id} className="text-white">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{message.sender}</span>
                <span className="text-xs text-gray-400">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-gray-200">{message.message}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="bg-gray-700 border-gray-600 text-white"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <Button onClick={sendMessage} size="sm">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CallInterface({ onEndCall, autoJoinRoomId }: { onEndCall: () => void; autoJoinRoomId?: string }) {
  // TODO: call page here
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="w-full p-4 flex items-center justify-between">
        <div id="status" className="text-sm text-white/80">Status: Disconnected</div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-white/80 text-sm">
            <input id="shareCamera" type="checkbox" className="accent-indigo-500" /> Cam+Mic
          </label>
          <label className="flex items-center gap-2 text-white/80 text-sm">
            <input id="shareScreen" type="checkbox" className="accent-indigo-500" /> Screen
          </label>
          <input id="roomId" placeholder="Room ID" className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white w-48" />
          <button id="startLocal" className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-sm">Start</button>
          <button id="joinRoom" className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm">Join</button>
        </div>
      </div>

      {/* Active screen share (1 in 1+3) */}
      <div className="px-4">
        <div className="rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 mb-3">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-white/70">Active Screen</span>
            <div className="flex items-center gap-2">
              <button id="screenPrev" className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">◀</button>
              <button id="screenNext" className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">▶</button>
            </div>
          </div>
          <video id="activeScreen" autoPlay playsInline className="w-full aspect-video bg-black" />
        </div>
      </div>

      {/* Participants grid (3x3 or 1x3 strip) */}
      <div className="px-4 flex-1 min-h-0">
        <div id="remotes" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" />
        <div className="flex items-center justify-center gap-2 py-3">
          <button id="peersPrev" className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm">◀ Prev</button>
          <button id="peersNext" className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm">Next ▶</button>
        </div>
      </div>

      {/* Media controls */}
      <div className="bg-gray-900 p-4 flex items-center justify-center gap-4">
        <Button id="ctrlMic" variant="secondary" size="icon" className="h-12 w-12 rounded-full">
          <Mic className="w-6 h-6" />
        </Button>
        <Button id="ctrlCam" variant="secondary" size="icon" className="h-12 w-12 rounded-full">
          <Video className="w-6 h-6" />
        </Button>
        <Button id="ctrlScreen" variant="secondary" size="icon" className="h-12 w-12 rounded-full">
          <Monitor className="w-6 h-6" />
        </Button>
        <Button id="ctrlLeave" variant="destructive" size="icon" className="h-12 w-12 rounded-full ml-6" onClick={onEndCall}>
          <PhoneCall className="w-6 h-6 rotate-180" />
        </Button>
      </div>
    </div>
  );
  useEffect(() => {
    initCallConnect();
    if (autoJoinRoomId) {
      const roomInput = document.getElementById('roomId') as HTMLInputElement | null;
      const joinBtn = document.getElementById('joinRoom') as HTMLButtonElement | null;
      const mic = document.getElementById('shareCamera') as HTMLInputElement | null;
      const screen = document.getElementById('shareScreen') as HTMLInputElement | null;
      if (mic) mic.checked = false;
      if (screen) screen.checked = false;
      if (roomInput) roomInput.value = autoJoinRoomId;
      setTimeout(() => { joinBtn?.click(); }, 0);
    }
  }, [autoJoinRoomId]);
  return null;
}

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
      color: MEETING_COLORS[0].value
    },
    {
      id: '2',
      title: 'Project Review',
      date: new Date(new Date().setHours(14, 30, 0, 0)),
      duration: 60,
      participants: ['Mike Johnson', 'Sarah Wilson'],
      type: 'video',
      status: 'scheduled',
      color: MEETING_COLORS[1].value
    }
  ]);

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

  const handleCreateMeeting = () => {
    const [hours, minutes] = newMeeting.time.split(':').map(Number);
    const meetingDate = new Date(newMeeting.date);
    meetingDate.setHours(hours, minutes);

    const meeting: Meeting = {
      id: Date.now().toString(),
      title: newMeeting.title,
      date: meetingDate,
      duration: newMeeting.duration,
      participants: newMeeting.participants.split(',').map(p => p.trim()).filter(Boolean),
      type: newMeeting.type,
      status: 'scheduled',
      description: newMeeting.description,
      color: newMeeting.color
    };

    setMeetings(prev => [...prev, meeting]);
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

  const handleCancelMeeting = (meetingId: string) => {
    setMeetings(prev => prev.map(meeting => 
      meeting.id === meetingId 
        ? { ...meeting, status: 'cancelled' as const }
        : meeting
    ));
  }; 

  const startCall = () => {
    navigate('/call/test');
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
          <Dialog open={isCreateMeetingOpen} onOpenChange={setIsCreateMeetingOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule New Meeting</DialogTitle>
                <DialogDescription>
                  Create a new meeting and invite participants.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Meeting Title</Label>
                  <Input
                    id="title"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter meeting title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Calendar
                      mode="single"
                      selected={newMeeting.date}
                      onSelect={(date) => date && setNewMeeting(prev => ({ ...prev, date }))}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={newMeeting.time}
                        onChange={(e) => setNewMeeting(prev => ({ ...prev, time: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Duration (minutes)</Label>
                      <Select 
                        value={newMeeting.duration.toString()} 
                        onValueChange={(value) => setNewMeeting(prev => ({ ...prev, duration: Number(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Meeting Type</Label>
                      <Select 
                        value={newMeeting.type} 
                        onValueChange={(value: 'video' | 'audio') => setNewMeeting(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">Video Call</SelectItem>
                          <SelectItem value="audio">Audio Call</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Meeting Color</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {MEETING_COLORS.map((color, index) => (
                          <button
                            key={index}
                            type="button"
                            className={`w-full h-8 rounded border-2 transition-all ${
                              newMeeting.color === color.value 
                                ? 'border-white ring-2 ring-primary' 
                                : 'border-transparent hover:border-white/50'
                            }`}
                            style={{ backgroundColor: color.value }}
                            onClick={() => setNewMeeting(prev => ({ ...prev, color: color.value }))}
                            title={color.name}
                          >
                            <span className="sr-only">{color.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="participants">Participants</Label>
                  <Input
                    id="participants"
                    value={newMeeting.participants}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, participants: e.target.value }))}
                    placeholder="Enter participant names separated by commas"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Meeting description (optional)"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateMeetingOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateMeeting}>
                    Schedule Meeting
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
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
            <div className="space-y-4">
              {meetings.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">No meetings scheduled</div>
              ) : (
                meetings.map((meeting) => (
                  <Card key={meeting.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meeting.color }} />
                        {meeting.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {meeting.date.toLocaleString()} — {meeting.duration} min
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Sliding Upcoming Meetings Panel */}
        <div className={`absolute top-0 right-0 h-full w-80 bg-background border-l border-border transition-transform duration-300 ease-in-out z-20 ${isUpcomingOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Upcoming Meetings
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsUpcomingOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="space-y-3">
                {upcomingMeetings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming meetings</p>
                ) : (
                  upcomingMeetings.map((meeting) => (
                    <div key={meeting.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: meeting.color || 'rgba(59, 130, 246, 0.8)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{meeting.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {meeting.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={startCall}>
                        <Video className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        {/* Overlay when panel is open */}
        {isUpcomingOpen && (
          <div 
            className="absolute inset-0 bg-black/20 z-10"
            onClick={() => setIsUpcomingOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function Initializer({ roomId, onLeave }: { roomId?: string; onLeave: () => void }) {
  useEffect(() => {
    initCallConnect();
    if (roomId) {
      const roomInput = document.getElementById('roomId') as HTMLInputElement | null;
      const joinBtn = document.getElementById('joinRoom') as HTMLButtonElement | null;
      const mic = document.getElementById('shareCamera') as HTMLInputElement | null;
      const screen = document.getElementById('shareScreen') as HTMLInputElement | null;
      if (mic) mic.checked = false;
      if (screen) screen.checked = false;
      if (roomInput) roomInput.value = roomId;
      setTimeout(() => { joinBtn?.click(); }, 0);
    }
    const leaveBtn = document.getElementById('ctrlLeave') as HTMLButtonElement | null;
    if (leaveBtn) {
      leaveBtn.onclick = onLeave;
    }
  }, [roomId, onLeave]);
  return null;
}