import React, { useEffect, useRef, useState } from 'react';
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
import { CallService } from '../utils/call-service';

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

function CallInterface({ onEndCall }: { onEndCall: () => void }) {
  const [callState, setCallState] = useState<CallState>({
    isInCall: true,
    isMuted: false,
    isCameraOn: true,
    isScreenSharing: false,
    isRecording: false,
    isChatOpen: false
  });

  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [screenStreams, setScreenStreams] = useState<Record<string, MediaStream>>({});
  const [activeScreenPeer, setActiveScreenPeer] = useState<string | null>(null);
  const [remoteVolumes, setRemoteVolumes] = useState<Record<string, number>>({});
  const selfAudioRef = useRef<HTMLAudioElement>(null);
  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const serviceRef = useRef<CallService | null>(null);
  const remoteAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const WS_URL = (import.meta as any).env?.VITE_SIGNALING_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/signaling`;
  const ROOM_ID = (import.meta as any).env?.VITE_SIGNALING_ROOM_ID || 'global-room';
  const ICE_SERVERS: RTCIceServer[] = (() => {
    const stunFromEnv = (import.meta as any).env?.VITE_STUN_URLS as string | undefined; // comma-separated
    const turnFromEnv = (import.meta as any).env?.VITE_TURN_URLS as string | undefined; // comma-separated
    const turnUser = (import.meta as any).env?.VITE_TURN_USERNAME as string | undefined;
    const turnPass = (import.meta as any).env?.VITE_TURN_PASSWORD as string | undefined;
    const stunList = (stunFromEnv?.split(',').map(s => s.trim()).filter(Boolean) || []);
    const turnList = (turnFromEnv?.split(',').map(s => s.trim()).filter(Boolean) || []);
    const servers: RTCIceServer[] = [];
    if (stunList.length) servers.push({ urls: stunList }); else servers.push({ urls: ['stun:stun.l.google.com:19302'] });
    if (turnList.length) servers.push({ urls: turnList, username: turnUser, credential: turnPass });
    return servers;
  })();
  const FORCE_TURN = ((import.meta as any).env?.VITE_FORCE_TURN || '').toString() === 'true';

  const toggleMute = () => {
    const next = !callState.isMuted;
    setCallState(prev => ({ ...prev, isMuted: next }));
    try {
      const svc = serviceRef.current as CallService;
      const stream = svc?.localStream as MediaStream | null;
      if (stream) stream.getAudioTracks().forEach(t => t.enabled = !next);
    } catch {}
  };

  const toggleCamera = async () => {
    const next = !callState.isCameraOn;
    setCallState(prev => ({ ...prev, isCameraOn: next }));
    try {
      const svc = serviceRef.current as CallService;
      if (next) {
        await svc?.enableVideo();
      } else {
        await svc?.disableVideo();
      }
    } catch {}
  };

  const toggleScreenShare = async () => {
    const wantEnable = !callState.isScreenSharing;
    try {
      const svc = serviceRef.current as CallService;
      if (wantEnable) {
        await svc?.enableScreenShare();
        setActiveScreenPeer('self');
        setCallState(prev => ({ ...prev, isScreenSharing: true }));
      } else {
        await svc?.disableScreenShare();
        setCallState(prev => ({ ...prev, isScreenSharing: false }));
      }
    } catch (e) {
      setCallState(prev => ({ ...prev, isScreenSharing: callState.isScreenSharing }));
    }
  };

  const toggleRecording = () => {
    setCallState(prev => ({ ...prev, isRecording: !prev.isRecording }));
  };

  const toggleChat = () => {
    setCallState(prev => ({ ...prev, isChatOpen: !prev.isChatOpen }));
  };

  useEffect(() => {
    const svc = new CallService(WS_URL, ROOM_ID, ICE_SERVERS, FORCE_TURN);
    serviceRef.current = svc;
    svc.onStream((peerId, stream) => {
      if (peerId === 'self') {
        if (selfAudioRef.current && stream) {
          selfAudioRef.current.srcObject = stream;
          selfAudioRef.current.muted = true;
          try { selfAudioRef.current.play().catch(() => {}); } catch {}
        }
        if (selfVideoRef.current && stream) {
          try {
            (selfVideoRef.current as any).srcObject = stream;
            (selfVideoRef.current as any).play?.();
          } catch {}
        }
        return;
      }
      if (peerId === 'self:screen') {
        setScreenStreams(prev => {
          const next = { ...prev } as Record<string, MediaStream>;
          if (stream) { next['self'] = stream; } else { delete next['self']; }
          return next;
        });
        if (stream) {
          setActiveScreenPeer(prev => prev ?? 'self');
        } else {
          setActiveScreenPeer(prev => (prev === 'self' ? null : prev));
          setCallState(cs => ({ ...cs, isScreenSharing: false }));
        }
        return;
      }
      if (peerId.endsWith(':screen')) {
        const baseId = peerId.replace(/:screen$/, '');
        setScreenStreams(prev => {
          const next = { ...prev } as Record<string, MediaStream>;
          if (stream) { next[baseId] = stream; } else { delete next[baseId]; }
          return next;
        });
        if (stream) {
          setActiveScreenPeer(prev => prev ?? baseId);
        } else {
          setActiveScreenPeer(prev => (prev === baseId ? null : prev));
        }
        return;
      }
      setRemoteStreams(prev => {
        const next = { ...prev } as Record<string, MediaStream>;
        if (stream) {
          next[peerId] = stream;
          setRemoteVolumes(v => (peerId in v ? v : { ...v, [peerId]: 1 }));
        } else {
          delete next[peerId];
          setRemoteVolumes(v => {
            const nv = { ...v } as Record<string, number>;
            delete nv[peerId];
            return nv;
          });
          try { delete remoteAudioRefs.current[peerId]; } catch {}
        }
        return next;
      });
    });
    (async () => {
      try {
        await svc.initLocalAudio();
      } catch {}
      await svc.connect();
    })();
    return () => {
      try { svc.disconnect(); } catch {}
    };
  }, []);

  useEffect(() => {
    const unlock = () => {
      try { selfAudioRef.current?.play().catch(() => {}); } catch {}
      try {
        Object.values(remoteAudioRefs.current as Record<string, HTMLAudioElement | null>).forEach(el => el?.play().catch(() => {}));
      } catch {}
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    // применяем громкость к активным audio элементам
    Object.entries(remoteAudioRefs.current as Record<string, HTMLAudioElement | null>).forEach(([pid, el]) => {
      if (el) {
        (el as HTMLAudioElement).volume = remoteVolumes[pid] ?? 1;
      }
    });
  }, [remoteVolumes]);

  // Если появился экран у кого-то, но активный не выбран — выбираем первый
  useEffect(() => {
    const keys = Object.keys(screenStreams);
    setActiveScreenPeer(prev => {
      if (prev && screenStreams[prev]) return prev;
      return keys.length ? keys[0] : null;
    });
  }, [screenStreams]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Main video area */}
      <div className="flex-1 relative bg-gray-900 min-h-0">
        <audio ref={selfAudioRef} className="hidden" />
        {Object.keys(screenStreams).length > 0 ? (
          <div className="absolute inset-0 flex flex-col p-4 gap-4">
            <div className="flex-1 relative rounded-lg overflow-hidden bg-gray-800">
              <video
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-contain bg-black"
                ref={(el) => {
                  if (!el) return;
                  try {
                    const activeId = (activeScreenPeer && screenStreams[activeScreenPeer]) ? activeScreenPeer : (Object.keys(screenStreams)[0] || null);
                    const s = activeId ? (screenStreams[activeId] || null) : null;
                    (el as any).srcObject = s;
                    if (s && s.getVideoTracks().length === 0) {
                      (el as any).srcObject = null;
                    } else if (s) {
                      (el as any).play?.();
                    }
                  } catch {}
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1">
                <div className="flex items-center justify-between">
                  <span className="truncate">{(activeScreenPeer || Object.keys(screenStreams)[0]) === 'self' ? 'You (Screen)' : `${activeScreenPeer || Object.keys(screenStreams)[0]} (Screen)`}</span>
                  {Object.keys(screenStreams).length > 1 && (
                    <div className="flex gap-2">
                      {Object.keys(screenStreams).map(pid => (
                        <Button key={pid} size="sm" variant={pid === activeScreenPeer ? 'default' : 'secondary'} onClick={() => setActiveScreenPeer(pid)}>
                          {pid === 'self' ? 'You' : pid}
                        </Button>
                      ))}
            </div>
                  )}
          </div>
        </div>
                  </div>
            {/* Лента камер снизу */}
            <div className="shrink-0 h-32 flex items-stretch gap-3 overflow-x-auto">
              {/* self camera */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden w-48 h-28 flex items-center justify-center">
                <video ref={selfVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[10px] px-2 py-0.5">You</div>
              </div>
              {Object.keys(remoteStreams).map((peerId) => {
                const stream = remoteStreams[peerId];
                const hasVideo = !!stream && stream.getVideoTracks().length > 0;
                return (
                  <div
                    key={peerId}
                    className="relative bg-gray-800 rounded-lg overflow-hidden w-48 h-28 flex items-center justify-center cursor-pointer"
                    onClick={() => { if (screenStreams[peerId]) setActiveScreenPeer(peerId); }}
                  >
                    {hasVideo ? (
                      <video
                        autoPlay
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                        ref={(el) => {
                          remoteVideoRefs.current[peerId] = el;
                          if (el) {
                            try { (el as any).srcObject = stream; (el as any).play?.(); } catch {}
                          }
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-900">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{peerId.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                  </div>
                )}
                    <audio
                      autoPlay
                      className="hidden"
                      ref={(el) => {
                        remoteAudioRefs.current[peerId] = el;
                        if (el) {
                          try {
                            el.srcObject = stream;
                            el.volume = remoteVolumes[peerId] ?? 1;
                            el.play().catch(() => {});
                          } catch {}
                        }
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-0.5 flex items-center gap-2">
                      <span className="truncate flex-1">{peerId}</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(((remoteVolumes[peerId] ?? 1) * 100) as number)}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, Number(e.target.value)));
                          const vol = val / 100;
                          setRemoteVolumes((prev) => ({ ...prev, [peerId]: vol }));
                        }}
                        className="w-16 h-1 accent-primary"
                      />
              </div>
                  </div>
                );
              })}
              </div>
            </div>
        ) : (
          // GRID 3x3 как раньше
          <div
            className="absolute inset-0 p-4 grid gap-3 h-full"
            style={{
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(3, minmax(0, 1fr))'
            }}
          >
            {(() => {
              const remoteIds = Object.keys(remoteStreams).slice(0, 8);
              const tiles: React.ReactNode[] = [];
              tiles.push(
                <div key="self" className="relative bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center min-h-0">
                  <video ref={selfVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                  <div className="text-white text-lg font-medium select-none">You</div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs px-2 py-1">You</div>
        </div>
              );
              remoteIds.forEach((peerId) => {
                const stream = remoteStreams[peerId];
                tiles.push(
                  <div key={peerId} className="relative bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center min-h-0">
                    <video
                      autoPlay
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                      ref={(el) => {
                        remoteVideoRefs.current[peerId] = el;
                        if (el) {
                          try { (el as any).srcObject = stream; (el as any).play?.(); } catch {}
                        }
                      }}
                    />
                    <audio
                      autoPlay
                      className="hidden"
                      ref={(el) => {
                        remoteAudioRefs.current[peerId] = el;
                        if (el) {
                          try {
                            el.srcObject = stream;
                            el.volume = remoteVolumes[peerId] ?? 1;
                            el.play().catch(() => {});
                          } catch {}
                        }
                      }}
                    />
                    <div className="text-white text-sm font-medium select-none truncate px-2">
                      {peerId}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate flex-1">{peerId}</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(((remoteVolumes[peerId] ?? 1) * 100) as number)}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, Number(e.target.value)));
                            const vol = val / 100;
                            setRemoteVolumes((prev) => ({ ...prev, [peerId]: vol }));
                          }}
                          className="w-24 h-1 accent-primary"
                        />
                      </div>
                    </div>
                  </div>
                );
              });
              const remaining = 9 - tiles.length;
              for (let i = 0; i < remaining; i++) {
                tiles.push(
                  <div key={`empty-${i}`} className="relative bg-gray-900/60 rounded-lg border border-white/5 min-h-0" />
                );
              }
              return tiles;
            })()}
          </div>
        )}

        {/* Recording indicator */}
        {callState.isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
            <Circle className="w-4 h-4 animate-pulse fill-current" />
            <span className="text-sm">Recording</span>
          </div>
        )}

        {/* Screen sharing indicator */}
        {callState.isScreenSharing && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full">
            <span className="text-sm">You are sharing your screen</span>
          </div>
        )}

        {/* Chat Panel */}
        <ChatPanel 
          isOpen={callState.isChatOpen} 
          onClose={() => setCallState(prev => ({ ...prev, isChatOpen: false }))} 
        />
      </div>

      {/* Call controls */}
      <div className="bg-gray-900 p-4 flex items-center justify-center gap-4">
        {/* Autoplay unlock button (visible если звук выключен браузером) */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            try { selfAudioRef.current?.play().catch(() => {}); } catch {}
            try {
              Object.values(remoteAudioRefs.current as Record<string, HTMLAudioElement | null>).forEach(el => el?.play().catch(() => {}));
            } catch {}
          }}
        >
          Включить звук
        </Button>

        <Button
          variant={callState.isMuted ? "destructive" : "secondary"}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={toggleMute}
        >
          {callState.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>

        <Button
          variant={callState.isCameraOn ? "secondary" : "destructive"}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={toggleCamera}
        >
          {callState.isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </Button>

        <Button
          variant={callState.isScreenSharing ? "default" : "secondary"}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={toggleScreenShare}
        >
          <Monitor className="w-6 h-6" />
        </Button>

        {/* Screen quality selector */}
        <Select onValueChange={async (val) => {
          try { await serviceRef.current?.setScreenQuality(val as any); } catch {}
        }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Quality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={callState.isChatOpen ? "default" : "secondary"}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={toggleChat}
        >
          <MessageCircle className="w-6 h-6" />
        </Button>

        <Button
          variant={callState.isRecording ? "default" : "secondary"}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={toggleRecording}
        >
          {callState.isRecording ? <StopCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
        </Button>

        <Button
          variant="secondary"
          size="icon"
          className="h-12 w-12 rounded-full"
        >
          <MoreVertical className="w-6 h-6" />
        </Button>

        <Button
          variant="destructive"
          size="icon"
          className="h-12 w-12 rounded-full ml-8"
          onClick={onEndCall}
        >
          <PhoneCall className="w-6 h-6 rotate-180" />
        </Button>
      </div>
    </div>
  );
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
    setIsInCall(true);
  };

  const endCall = () => {
    setIsInCall(false);
  };

  if (isInCall) {
    return <CallInterface onEndCall={endCall} />;
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
          <Button size="sm" onClick={() => setIsInCall(true)}>
            <PhoneCall className="w-4 h-4 mr-2" />
            JOIN ALL
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
