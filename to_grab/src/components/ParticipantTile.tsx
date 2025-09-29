import React, { useState } from 'react';
import { Mic, MicOff, Camera, CameraOff, Hand, Crown, Wifi, WifiOff, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from './ui/dropdown-menu';

interface Participant {
  id: string;
  name: string;
  isHost?: boolean;
  isMuted?: boolean;
  cameraOff?: boolean;
  handRaised?: boolean;
  isSpeaking?: boolean;
  hasVideo?: boolean;
  connectionQuality?: 'good' | 'poor';
  isPinned?: boolean;
}

interface ParticipantTileProps {
  participant: Participant;
  size?: 'small' | 'medium' | 'large';
  onPin?: (id: string) => void;
  onMute?: (id: string) => void;
  className?: string;
}

export function ParticipantTile({ 
  participant, 
  size = 'medium', 
  onPin, 
  onMute, 
  className = '' 
}: ParticipantTileProps) {
  const [showMenu, setShowMenu] = useState(false);

  const sizeClasses = {
    small: 'h-32 w-44', // 128px x 176px for bottom strip in 1+3 mode
    medium: 'aspect-video w-full', // Rectangular aspect ratio for 3x3 grid
    large: 'h-80 w-96'
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div 
      className={`
        relative rounded-xl overflow-hidden transition-all duration-200 ease-out
        ${sizeClasses[size]}
        ${participant.isSpeaking 
          ? 'ring-2 ring-[#39A0FF] shadow-[0_0_12px_rgba(57,160,255,0.4)]' 
          : 'ring-1 ring-[#2A2D32]'
        }
        ${participant.isPinned ? 'ring-[#FFB86B]' : ''}
        hover:ring-[#39A0FF] hover:shadow-[0_0_8px_rgba(57,160,255,0.2)]
        ${className}
      `}
      style={{ backgroundColor: '#16171A' }}
    >
      {/* Video or Avatar Background */}
      {participant.hasVideo && !participant.cameraOff ? (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Just Camera Off Icon */}
          <div className="w-16 h-16 rounded-full bg-[#2A2D32] flex items-center justify-center">
            <CameraOff className="w-8 h-8 text-[#AAB0B6]" />
          </div>
        </div>
      )}

      {/* Top Status Icons */}
      <div className="absolute top-3 left-3 flex space-x-2">
        {participant.cameraOff && (
          <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
            <CameraOff className="w-3 h-3 text-[#AAB0B6]" />
          </div>
        )}
      </div>

      <div className="absolute top-3 right-3 flex space-x-2">
        {participant.connectionQuality === 'poor' && (
          <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
            <WifiOff className="w-3 h-3 text-red-400" />
          </div>
        )}
        {participant.connectionQuality === 'good' && (
          <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
            <Wifi className="w-3 h-3 text-green-400" />
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-[#E6E7E9] font-medium text-sm truncate">
              {participant.name}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-2">
            {participant.isMuted && (
              <MicOff className="w-4 h-4 text-red-400" />
            )}
            {!participant.isMuted && (
              <Mic className="w-4 h-4 text-green-400" />
            )}
            {participant.handRaised && (
              <Hand className="w-4 h-4 text-[#FFB86B]" />
            )}
            {participant.isHost && (
              <Crown className="w-4 h-4 text-[#FFB86B]" />
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 w-8 h-8 p-0 bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <MoreVertical className="w-4 h-4 text-white" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-[#16171A] border-[#2A2D32]">
          <DropdownMenuItem onClick={() => onPin?.(participant.id)}>
            {participant.isPinned ? 'Unpin' : 'Pin'}
          </DropdownMenuItem>
          <DropdownMenuItem>Spotlight</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMute?.(participant.id)}>
            {participant.isMuted ? 'Unmute' : 'Mute'}
          </DropdownMenuItem>
          <DropdownMenuItem>Open profile</DropdownMenuItem>
          <DropdownMenuItem>Start private chat</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Speaking Pulse Animation */}
      {participant.isSpeaking && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-[#39A0FF] animate-pulse" />
      )}
    </div>
  );
}