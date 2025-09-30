import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../components/ui/button';
import { Mic, MicOff, Video, VideoOff, Monitor, ArrowRight } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

export default function PreJoinPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation() as any;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const meetingTitle = location.state?.title as string | undefined;
  const meetingStartIso = location.state?.start as string | undefined;
  const meetingDuration = location.state?.duration as number | undefined;
  const timeframe = (() => {
    if (!meetingStartIso || !meetingDuration) return '';
    const start = new Date(meetingStartIso);
    const end = new Date(start.getTime() + meetingDuration * 60000);
    const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${fmt(start)}–${fmt(end)}`;
  })();

  useEffect(() => {
    (async () => {
      try {
        // Запрашиваем устройства по необходимости
        let s: MediaStream | null = null;
        if (micEnabled || camEnabled) {
          s = await navigator.mediaDevices.getUserMedia({ audio: micEnabled, video: camEnabled });
        } else {
          // Ничего не запрашиваем — показываем заглушку
          s = await navigator.mediaDevices.getUserMedia({ audio: false, video: false }).catch(() => null);
        }
        if (s) {
          s.getAudioTracks().forEach(t => t.enabled = micEnabled);
          s.getVideoTracks().forEach(t => t.enabled = camEnabled);
        }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s || null;
          await videoRef.current.play().catch(() => {});
        }
      } catch {}
    })();
    return () => {
      try { stream?.getTracks().forEach(t => t.stop()); } catch {}
    };
  }, []);

  useEffect(() => {
    (async () => {
      // Если треков нет, а включили — запрашиваем
      if ((micEnabled || camEnabled) && !stream) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: micEnabled, video: camEnabled });
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            await videoRef.current.play().catch(() => {});
          }
          return;
        } catch {}
      }
      // Если есть стрим — обновляем enabled или останавливаем/убираем треки
      if (stream) {
        if (!micEnabled) stream.getAudioTracks().forEach(t => { t.stop(); stream.removeTrack(t); });
        if (!camEnabled) stream.getVideoTracks().forEach(t => { t.stop(); stream.removeTrack(t); });
        if (micEnabled && stream.getAudioTracks().length === 0) {
          try { const aud = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.addTrack(aud.getAudioTracks()[0]); } catch {}
        }
        if (camEnabled && stream.getVideoTracks().length === 0) {
          try { const vid = await navigator.mediaDevices.getUserMedia({ video: true }); stream.addTrack(vid.getVideoTracks()[0]); } catch {}
        }
      }
    })();
  }, [micEnabled, camEnabled]);

  const proceed = () => {
    try {
      (window as any).prejoinSettings = { micEnabled, camEnabled };
    } catch {}
    navigate(`/call/${roomId || 'test'}`);
  };

  return (
    <div className="h-screen w-screen bg-[#0B0B0D] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 aspect-video flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover bg-black" muted />
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{meetingTitle || 'Device check'}</h2>
          {timeframe && <div className="text-sm text-white/70">{timeframe}</div>}
          <div className="flex gap-3">
            <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full" onClick={() => setMicEnabled(v => !v)}>
              {micEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </Button>
            <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full" onClick={() => setCamEnabled(v => !v)}>
              {camEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </Button>
          </div>
          <Button className="mt-2" onClick={proceed}>
            Join call <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}


