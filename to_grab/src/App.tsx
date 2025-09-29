import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ParticipantTile } from './components/ParticipantTile';
import { ScreenShareArea } from './components/ScreenShareArea';
import { Pagination } from './components/Pagination';
import { NavigationControls } from './components/NavigationControls';

// Mock participant data
const mockParticipants = [
  {
    id: '1',
    name: 'Alice Johnson',
    isHost: true,
    isMuted: false,
    cameraOff: false,
    handRaised: false,
    isSpeaking: true,
    hasVideo: true,
    connectionQuality: 'good' as const,
    isPinned: false,
  },
  {
    id: '2',
    name: 'Bob Smith',
    isMuted: true,
    cameraOff: true,
    handRaised: false,
    isSpeaking: false,
    hasVideo: false,
    connectionQuality: 'good' as const,
    isPinned: false,
  },
  {
    id: '3',
    name: 'Carol Williams',
    isMuted: false,
    cameraOff: false,
    handRaised: true,
    isSpeaking: false,
    hasVideo: true,
    connectionQuality: 'poor' as const,
    isPinned: false,
  },
  {
    id: '4',
    name: 'David Brown',
    isMuted: false,
    cameraOff: false,
    handRaised: false,
    isSpeaking: false,
    hasVideo: true,
    connectionQuality: 'good' as const,
    isPinned: false,
  },
  {
    id: '5',
    name: 'Emma Davis',
    isMuted: true,
    cameraOff: false,
    handRaised: false,
    isSpeaking: false,
    hasVideo: true,
    connectionQuality: 'good' as const,
    isPinned: false,
  },
  {
    id: '6',
    name: 'Frank Miller',
    isMuted: false,
    cameraOff: true,
    handRaised: false,
    isSpeaking: false,
    hasVideo: false,
    connectionQuality: 'good' as const,
    isPinned: false,
  },
  {
    id: '7',
    name: 'Grace Wilson',
    isMuted: false,
    cameraOff: false,
    handRaised: false,
    isSpeaking: false,
    hasVideo: true,
    connectionQuality: 'good' as const,
    isPinned: false,
  },
  {
    id: '8',
    name: 'Henry Taylor',
    isMuted: true,
    cameraOff: false,
    handRaised: false,
    isSpeaking: false,
    hasVideo: true,
    connectionQuality: 'poor' as const,
    isPinned: false,
  },
  {
    id: '9',
    name: 'Ivy Anderson',
    isMuted: false,
    cameraOff: false,
    handRaised: false,
    isSpeaking: false,
    hasVideo: true,
    connectionQuality: 'good' as const,
    isPinned: false,
  },
  {
    id: '10',
    name: 'Jack Thompson',
    isMuted: false,
    cameraOff: true,
    handRaised: false,
    isSpeaking: false,
    hasVideo: false,
    connectionQuality: 'good' as const,
    isPinned: false,
  },
  {
    id: '11',
    name: 'Karen Lee',
    isMuted: true,
    cameraOff: false,
    handRaised: false,
    isSpeaking: false,
    hasVideo: true,
    connectionQuality: 'good' as const,
    isPinned: false,
  },
  {
    id: '12',
    name: 'Liam Garcia',
    isMuted: false,
    cameraOff: false,
    handRaised: false,
    isSpeaking: false,
    hasVideo: true,
    connectionQuality: 'good' as const,
    isPinned: false,
  },
];

// Mock screen share data
const mockScreenShares = [
  {
    id: 'share-1',
    participantName: 'Alice Johnson',
    isActive: true,
    content: 'Project Presentation'
  },
  {
    id: 'share-2',
    participantName: 'David Brown',
    isActive: false,
    content: 'Design Mockups'
  }
];

export default function App() {
  const [participants, setParticipants] = useState(mockParticipants);
  const [screenShares, setScreenShares] = useState<typeof mockScreenShares>([]);
  const [activeShareId, setActiveShareId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [bottomStripPage, setBottomStripPage] = useState(1);
  const [isSharing, setIsSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  const participantsPerPage = 6; // 3x2 grid
  const bottomStripPerPage = 3;

  // Check if we should be in demo mode
  const isDemoMode = screenShares.length > 0;

  // Calculate pagination
  const totalPages = Math.ceil(participants.length / participantsPerPage);
  const totalBottomPages = Math.ceil(participants.length / bottomStripPerPage);

  // Get current page participants
  const getCurrentPageParticipants = () => {
    if (isDemoMode) {
      // For demo mode bottom strip
      const startIndex = (bottomStripPage - 1) * bottomStripPerPage;
      return participants.slice(startIndex, startIndex + bottomStripPerPage);
    } else {
      // For 3x3 grid
      const startIndex = (currentPage - 1) * participantsPerPage;
      return participants.slice(startIndex, startIndex + participantsPerPage);
    }
  };

  const handlePin = (participantId: string) => {
    setParticipants(prev => 
      prev.map(p => 
        p.id === participantId 
          ? { ...p, isPinned: !p.isPinned }
          : p
      )
    );
  };

  const handleMute = (participantId: string) => {
    setParticipants(prev => 
      prev.map(p => 
        p.id === participantId 
          ? { ...p, isMuted: !p.isMuted }
          : p
      )
    );
  };

  const handleShareToggle = () => {
    setIsSharing(!isSharing);
    if (!isSharing) {
      // Start sharing - add current user's share
      const newShare = {
        id: 'my-share',
        participantName: 'You',
        isActive: true,
        content: 'Your Screen'
      };
      setScreenShares([newShare, ...mockScreenShares]);
      setActiveShareId('my-share');
    } else {
      // Stop sharing - remove current user's share
      setScreenShares(prev => prev.filter(share => share.id !== 'my-share'));
      if (activeShareId === 'my-share') {
        setActiveShareId(screenShares.find(s => s.id !== 'my-share')?.id || '');
      }
    }
  };

  // Simulate mode switching
  useEffect(() => {
    const timer = setTimeout(() => {
      if (screenShares.length === 0) {
        setScreenShares(mockScreenShares);
        setActiveShareId(mockScreenShares[0]?.id || '');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className="min-h-screen p-6 transition-all duration-300"
      style={{ backgroundColor: '#0B0B0D' }}
    >
      {isDemoMode ? (
        /* Demo Mode: 1+3 Layout */
        <div className="max-w-7xl mx-auto">
          {/* Screen Share Area */}
          <ScreenShareArea
            screenShares={screenShares}
            activeShareId={activeShareId}
            onShareChange={setActiveShareId}
            className="mb-4"
          />

          {/* Bottom Participant Strip */}
          <div className="relative mt-8">
            <div className="flex justify-center items-center">
              {/* Left Arrow */}
              {totalBottomPages > 1 && bottomStripPage > 1 && (
                <button
                  onClick={() => setBottomStripPage(bottomStripPage - 1)}
                  className="absolute left-4 z-10 w-8 h-8 bg-black/50 hover:bg-[#39A0FF]/20 rounded-full flex items-center justify-center text-white transition-all duration-200"
                  title="Previous"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Participant Tiles */}
              <div className="flex space-x-4">
                {getCurrentPageParticipants().map(participant => (
                  <ParticipantTile
                    key={participant.id}
                    participant={participant}
                    size="small"
                    onPin={handlePin}
                    onMute={handleMute}
                    className="group"
                  />
                ))}
              </div>

              {/* Right Arrow */}
              {totalBottomPages > 1 && bottomStripPage < totalBottomPages && (
                <button
                  onClick={() => setBottomStripPage(bottomStripPage + 1)}
                  className="absolute right-4 z-10 w-8 h-8 bg-black/50 hover:bg-[#39A0FF]/20 rounded-full flex items-center justify-center text-white transition-all duration-200"
                  title="Next"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Bottom Strip Pagination Dots */}
            {totalBottomPages > 1 && (
              <div className="fixed bottom-18 left-1/2 transform -translate-x-1/2">
                <div className="flex space-x-1">
                  {Array.from({ length: totalBottomPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setBottomStripPage(i + 1)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        bottomStripPage === i + 1 
                          ? 'bg-[#39A0FF]' 
                          : 'bg-[#AAB0B6]/30 hover:bg-[#AAB0B6]/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Grid Mode: 3x2 Layout */
        <div className="max-w-7xl mx-auto pb-20">
          {/* 3x2 Grid */}
          <div className="grid grid-cols-3 grid-rows-2 gap-4 h-[calc(100vh-140px)] p-4">
            {getCurrentPageParticipants().map(participant => (
              <ParticipantTile
                key={participant.id}
                participant={participant}
                size="medium"
                onPin={handlePin}
                onMute={handleMute}
                className="group"
              />
            ))}
          </div>

          {/* Grid Pagination */}
          {totalPages > 1 && (
            <div className="fixed bottom-18 left-1/2 transform -translate-x-1/2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                size="large"
              />
            </div>
          )}
        </div>
      )}

      {/* Navigation Controls */}
      <div className="fixed bottom-2 left-4 right-4">
        <div className="max-w-7xl mx-auto">
          <div 
            className="rounded-xl px-4 py-2 border"
            style={{ 
              backgroundColor: '#16171A',
              borderColor: '#2A2D32'
            }}
          >
            <NavigationControls
              participantCount={participants.length}
              sharingCount={screenShares.length}
              isRecording={false}
              isMuted={isMuted}
              cameraOff={cameraOff}
              isSharing={isSharing}
              handRaised={handRaised}
              onMuteToggle={() => setIsMuted(!isMuted)}
              onCameraToggle={() => setCameraOff(!cameraOff)}
              onShareToggle={handleShareToggle}
              onHandToggle={() => setHandRaised(!handRaised)}
              onLeave={() => console.log('Leave call')}
            />
          </div>
        </div>
      </div>

      {/* Mode Transition Indicator */}
      <div className="fixed top-6 right-6">
        <div 
          className="px-4 py-2 rounded-lg border text-sm"
          style={{ 
            backgroundColor: '#16171A',
            borderColor: '#2A2D32',
            color: '#E6E7E9'
          }}
        >
          {isDemoMode ? '1+3 Demo Mode' : '3×3 Grid Mode'}
        </div>
      </div>
    </div>
  );
}