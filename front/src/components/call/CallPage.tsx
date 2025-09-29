import React, { useEffect, useState } from 'react';
import './globals.css';
import './index.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ParticipantTile } from './ParticipantTile';
// import { ScreenShareArea } from './ScreenShareArea';
// import { Pagination } from './Pagination';
import { NavigationControls } from './NavigationControls';

export default function CallPage() {
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    const onLocal = (e: any) => {
      const { micEnabled, camEnabled, screenEnabled } = (e as CustomEvent).detail || {};
      if (typeof micEnabled === 'boolean') setIsMuted(!micEnabled);
      if (typeof camEnabled === 'boolean') setCameraOff(!camEnabled);
      if (typeof screenEnabled === 'boolean') setIsSharing(!!screenEnabled);
    };
    window.addEventListener('call:localStatus', onLocal as any);
    return () => window.removeEventListener('call:localStatus', onLocal as any);
  }, []);

  return (
    <div className="min-h-screen p-6 transition-all duration-300" style={{ backgroundColor: '#0B0B0D' }}>
      <div className="max-w-7xl mx-auto pb-24">
        {/* Active Screen (top) */}
        <div className="rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 mb-4">
          <video id="activeScreen" autoPlay playsInline className="w-full aspect-video bg-black" style={{ display: 'none' }} />
        </div>
        {/* Bottom strip (participants) */}
        <div id="remotes" className="flex justify-center items-center gap-4 p-4" />
      </div>

      {/* Navigation Controls + hidden DOM hooks for RTC */}
      <div className="fixed bottom-2 left-4 right-4">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-xl px-4 py-2 border" style={{ backgroundColor: '#16171A', borderColor: '#2A2D32' }}>
            <NavigationControls
              participantCount={0}
              sharingCount={isSharing ? 1 : 0}
              isRecording={false}
              isMuted={isMuted}
              cameraOff={cameraOff}
              isSharing={isSharing}
              handRaised={false}
              onMuteToggle={() => (document.getElementById('ctrlMic') as HTMLButtonElement | null)?.click()}
              onCameraToggle={() => (document.getElementById('ctrlCam') as HTMLButtonElement | null)?.click()}
              onShareToggle={() => (document.getElementById('ctrlScreen') as HTMLButtonElement | null)?.click()}
              onHandToggle={() => {}}
              onLeave={() => (document.getElementById('ctrlLeave') as HTMLButtonElement | null)?.click()}
            />
            {/* Hidden RTC control hooks */}
            <div style={{ display: 'none' }}>
              <div id="status">Status: Disconnected</div>
              <input id="roomId" />
              <input id="shareCamera" type="checkbox" />
              <input id="shareScreen" type="checkbox" />
              <button id="startLocal" />
              <button id="joinRoom" />
              <button id="ctrlMic" />
              <button id="ctrlCam" />
              <button id="ctrlScreen" />
              <button id="ctrlLeave" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}