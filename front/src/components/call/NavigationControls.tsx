import React, { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  Monitor, 
  MonitorOff,
  Hand,
  Users,
  PhoneOff,
  Settings,
  MoreVertical
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface NavigationControlsProps {
  participantCount: number;
  sharingCount: number;
  isRecording?: boolean;
  isMuted?: boolean;
  cameraOff?: boolean;
  isSharing?: boolean;
  handRaised?: boolean;
  onMuteToggle?: () => void;
  onCameraToggle?: () => void;
  onShareToggle?: () => void;
  onHandToggle?: () => void;
  onLeave?: () => void;
  className?: string;
}

export function NavigationControls({
  participantCount,
  sharingCount,
  isRecording = false,
  isMuted = false,
  cameraOff = false,
  isSharing = false,
  handRaised = false,
  onMuteToggle,
  onCameraToggle,
  onShareToggle,
  onHandToggle,
  onLeave,
  className = ''
}: NavigationControlsProps) {
  const [showParticipants, setShowParticipants] = useState(false);

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Left: Participant Count & Recording Status */}
      <div className="flex items-center space-x-3">
        <div className="text-[#AAB0B6] text-xs">
          {participantCount} participants
          {sharingCount > 0 && ` • ${sharingCount} sharing`}
        </div>
        {isRecording && (
          <div className="flex items-center space-x-1">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-xs">Recording</span>
          </div>
        )}
      </div>

      {/* Center: Main Controls */}
      <div className="flex items-center space-x-2">
        {/* Mute/Unmute */}
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="sm"
          className={`w-9 h-9 p-0 rounded-full transition-all duration-200 ${
            isMuted 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-[#2A2D32] hover:bg-[#39A0FF]'
          }`}
          onClick={onMuteToggle}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>

        {/* Camera Toggle */}
        <Button
          variant={cameraOff ? "destructive" : "secondary"}
          size="sm"
          className={`w-9 h-9 p-0 rounded-full transition-all duration-200 ${
            cameraOff 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-[#2A2D32] hover:bg-[#39A0FF]'
          }`}
          onClick={onCameraToggle}
          title={cameraOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {cameraOff ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
        </Button>

        {/* Screen Share */}
        <Button
          variant={isSharing ? "default" : "secondary"}
          size="sm"
          className={`w-9 h-9 p-0 rounded-full transition-all duration-200 ${
            isSharing 
              ? 'bg-[#39A0FF] hover:bg-[#39A0FF]/80' 
              : 'bg-[#2A2D32] hover:bg-[#39A0FF]'
          }`}
          onClick={onShareToggle}
          title={isSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
        </Button>

        {/* Raise Hand */}
        <Button
          variant={handRaised ? "default" : "secondary"}
          size="sm"
          className={`w-9 h-9 p-0 rounded-full transition-all duration-200 ${
            handRaised 
              ? 'bg-[#FFB86B] hover:bg-[#FFB86B]/80' 
              : 'bg-[#2A2D32] hover:bg-[#39A0FF]'
          }`}
          onClick={onHandToggle}
          title={handRaised ? 'Lower hand' : 'Raise hand'}
        >
          <Hand className="w-4 h-4" />
        </Button>

        {/* Participants Panel */}
        <Button
          variant="secondary"
          size="sm"
          className="w-9 h-9 p-0 rounded-full bg-[#2A2D32] hover:bg-[#39A0FF] transition-all duration-200 relative"
          onClick={() => setShowParticipants(!showParticipants)}
          title="Participants"
        >
          <Users className="w-4 h-4" />
          {participantCount > 1 && (
            <Badge 
              variant="secondary" 
              className="absolute -top-0.5 -right-0.5 w-4 h-4 p-0 text-xs bg-[#39A0FF] text-white border-0 text-[10px]"
            >
              {participantCount}
            </Badge>
          )}
        </Button>

        {/* More Options */}
        <Button
          variant="secondary"
          size="sm"
          className="w-9 h-9 p-0 rounded-full bg-[#2A2D32] hover:bg-[#39A0FF] transition-all duration-200"
          title="More options"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Right: Leave Call */}
      <div className="flex items-center">
        <Button
          variant="destructive"
          size="sm"
          className="w-9 h-9 p-0 rounded-full bg-red-600 hover:bg-red-700 transition-all duration-200"
          onClick={onLeave}
          title="Leave call"
        >
          <PhoneOff className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}