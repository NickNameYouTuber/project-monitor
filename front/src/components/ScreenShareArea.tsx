import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from './ui/button';

interface ScreenShare {
  id: string;
  participantName: string;
  isActive: boolean;
  content: string; // Mock content type
}

interface ScreenShareAreaProps {
  screenShares: ScreenShare[];
  activeShareId: string;
  onShareChange: (shareId: string) => void;
  className?: string;
}

export function ScreenShareArea({ 
  screenShares, 
  activeShareId, 
  onShareChange, 
  className = '' 
}: ScreenShareAreaProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const activeShare = screenShares.find(share => share.id === activeShareId);
  const otherShares = screenShares.filter(share => share.id !== activeShareId);

  const nextShare = () => {
    const currentIndex = screenShares.findIndex(share => share.id === activeShareId);
    const nextIndex = (currentIndex + 1) % screenShares.length;
    onShareChange(screenShares[nextIndex].id);
  };

  const prevShare = () => {
    const currentIndex = screenShares.findIndex(share => share.id === activeShareId);
    const prevIndex = currentIndex === 0 ? screenShares.length - 1 : currentIndex - 1;
    onShareChange(screenShares[prevIndex].id);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Screen Share Display */}
      <div 
        className="relative w-full rounded-xl overflow-hidden bg-[#0F1113] border border-[#2A2D32]"
        style={{ height: 'clamp(320px, 65vh, 720px)' }}
      >
        {/* Mock Screen Content */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900/10 to-purple-900/10">
          <div className="text-center">
            <div className="text-[#E6E7E9] text-2xl font-medium mb-2">
              {activeShare?.participantName}'s Screen
            </div>
            <div className="text-[#AAB0B6] text-lg">
              {activeShare?.content || 'Presentation Content'}
            </div>
            <div className="mt-8 w-64 h-40 bg-[#16171A] rounded-lg border border-[#2A2D32] flex items-center justify-center">
              <div className="text-[#AAB0B6]">Mock Screen Content</div>
            </div>
          </div>
        </div>

        {/* Navigation Arrows (when multiple shares) */}
        {screenShares.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 p-0 bg-black/50 hover:bg-black/70 text-white"
              onClick={prevShare}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 p-0 bg-black/50 hover:bg-black/70 text-white"
              onClick={nextShare}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Fullscreen Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 w-10 h-10 p-0 bg-black/50 hover:bg-black/70 text-white"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </Button>

        {/* Share Info */}
        <div className="absolute bottom-4 left-4 bg-black/60 rounded-lg px-3 py-2">
          <div className="text-[#E6E7E9] text-sm font-medium">
            {activeShare?.participantName}
          </div>
          <div className="text-[#AAB0B6] text-xs">
            Sharing screen
          </div>
        </div>

        {/* Multiple Shares Indicator */}
        {screenShares.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/60 rounded-lg px-3 py-2">
            <div className="text-[#AAB0B6] text-xs">
              {screenShares.findIndex(s => s.id === activeShareId) + 1} / {screenShares.length}
            </div>
          </div>
        )}
      </div>

      {/* Mini Previews of Other Shares */}
      {otherShares.length > 0 && (
        <div className="absolute right-4 top-4 space-y-2">
          {otherShares.slice(0, 3).map((share) => (
            <button
              key={share.id}
              onClick={() => onShareChange(share.id)}
              className="block w-20 h-14 bg-[#16171A] border border-[#2A2D32] rounded-md hover:border-[#39A0FF] transition-colors overflow-hidden"
            >
              <div className="w-full h-full bg-gradient-to-br from-gray-700/20 to-gray-800/20 flex items-center justify-center">
                <div className="text-[#AAB0B6] text-xs font-medium">
                  {share.participantName.split(' ')[0]}
                </div>
              </div>
            </button>
          ))}
          {otherShares.length > 3 && (
            <div className="w-20 h-14 bg-[#16171A] border border-[#2A2D32] rounded-md flex items-center justify-center">
              <div className="text-[#AAB0B6] text-xs">
                +{otherShares.length - 3}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}